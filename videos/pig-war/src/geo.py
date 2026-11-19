"""Map data + camera for the map-explainer renderer.

Land polygons come from Natural Earth 10m land (public domain). They're
projected to Web-Mercator-style "degree" units (x = lon, y = -mercator(lat)
so north is up on screen), simplified at several levels, and cached.
"""
import math
import os
import pickle
import urllib.request
import zipfile

import cairo
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, "..", ".cache")
NE_URL = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip"

# (max simplification tolerance in world units, min zoom in px/unit to use it)
LEVELS = [(0.0, 150.0), (0.01, 15.0), (0.04, 4.0), (0.15, 0.0)]

# Region whose coastlines get Chaikin-smoothed so close zooms look organic.
PATH_SCALE = 1000.0
SMOOTH_BOX = (-126.0, 47.0, -121.5, 50.5)


def merc(lon, lat):
    lat = max(-85.0, min(85.0, lat))
    return lon, -math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))


def merc_np(lon, lat):
    lat = np.clip(lat, -85.0, 85.0)
    return lon, -np.degrees(np.log(np.tan(np.pi / 4 + np.radians(lat) / 2)))


def _chaikin(pts, n=2):
    for _ in range(n):
        p = pts[:-1] if np.allclose(pts[0], pts[-1]) else pts
        q = 0.75 * p + 0.25 * np.roll(p, -1, axis=0)
        r = 0.25 * p + 0.75 * np.roll(p, -1, axis=0)
        out = np.empty((len(p) * 2, 2))
        out[0::2] = q
        out[1::2] = r
        pts = np.vstack([out, out[:1]])
    return pts


def _download():
    os.makedirs(CACHE_DIR, exist_ok=True)
    shp = os.path.join(CACHE_DIR, "ne_10m_land.shp")
    if not os.path.exists(shp):
        z = os.path.join(CACHE_DIR, "ne_10m_land.zip")
        if not os.path.exists(z):
            print("downloading Natural Earth land…")
            urllib.request.urlretrieve(NE_URL, z)
        with zipfile.ZipFile(z) as f:
            f.extractall(CACHE_DIR)
    return shp


def load_rings():
    """Return list of levels; each level is a list of (bbox, Nx2 array)."""
    cache = os.path.join(CACHE_DIR, "rings.pkl")
    if os.path.exists(cache):
        with open(cache, "rb") as f:
            return pickle.load(f)
    import shapefile
    from shapely.geometry import shape, Polygon

    shp = _download()
    polys = []
    for s in shapefile.Reader(shp).shapes():
        g = shape(s.__geo_interface__)
        polys.extend(getattr(g, "geoms", [g]))

    from shapely.geometry import box as sbox
    smooth_box = sbox(*SMOOTH_BOX)

    def add_rings(rings, geom, tol, smooth):
        for qq in getattr(geom, "geoms", [geom]):
            if not isinstance(qq, Polygon) or qq.is_empty or qq.area < (tol * tol * 0.5):
                continue
            if smooth:
                qq = qq.simplify(0.0025, preserve_topology=True)
                if qq.is_empty:
                    continue
            for ring in [qq.exterior] + list(qq.interiors):
                a = np.asarray(ring.coords)
                if len(a) < 4:
                    continue
                if smooth:
                    a = _chaikin(a, 2)
                x, y = merc_np(a[:, 0], a[:, 1])
                rings.append(((x.min(), y.min(), x.max(), y.max()), np.column_stack([x, y])))

    levels = []
    for tol, _ in LEVELS:
        rings = []
        for p in polys:
            if tol == 0:
                if p.intersects(smooth_box):
                    add_rings(rings, p.intersection(smooth_box), 0, True)
                    add_rings(rings, p.difference(smooth_box), 0, False)
                else:
                    add_rings(rings, p, 0, False)
            else:
                add_rings(rings, p.simplify(tol, preserve_topology=True), tol, False)
        levels.append(rings)
    with open(cache, "wb") as f:
        pickle.dump(levels, f)
    return levels


class Camera:
    """center (world units), zoom (px per unit), rot (deg), tilt (y squash)."""

    def __init__(self, cx, cy, zoom, rot=0.0, tilt=1.0, W=1080, H=1920, sy=0.47):
        self.cx, self.cy, self.zoom, self.rot, self.tilt = cx, cy, zoom, rot, tilt
        self.W, self.H = W, H
        self.sx, self.sy = W / 2, H * sy

    def matrix(self):
        m = cairo.Matrix()
        m.translate(self.sx, self.sy)
        m.rotate(math.radians(self.rot))
        m.scale(self.zoom, self.zoom * self.tilt)
        m.translate(-self.cx, -self.cy)
        return m

    def to_screen(self, lon, lat):
        x, y = merc(lon, lat)
        return self.matrix().transform_point(x, y)

    def world_bbox(self):
        r = math.hypot(self.W, self.H) / self.zoom / min(1.0, self.tilt)
        return (self.cx - r, self.cy - r, self.cx + r, self.cy + r)


class LandPaths:
    """Per-level cairo Path objects in world coords, appended through the camera."""

    def __init__(self):
        levels = load_rings()
        scratch = cairo.Context(cairo.ImageSurface(cairo.FORMAT_A8, 1, 1))
        self.levels = []
        for rings in levels:
            items = []
            for bbox, xy in rings:
                scratch.new_path()
                q = xy * PATH_SCALE  # cairo paths are 24.8 fixed point: keep precision
                scratch.move_to(*q[0])
                for x, y in q[1:]:
                    scratch.line_to(x, y)
                scratch.close_path()
                items.append((bbox, scratch.copy_path()))
            self.levels.append(items)

    def append(self, ctx, cam):
        """Append visible land rings to ctx's path in device space."""
        li = len(LEVELS) - 1
        for i, (_, minzoom) in enumerate(LEVELS):
            if cam.zoom >= minzoom:
                li = i
                break
        x0, y0, x1, y1 = cam.world_bbox()
        ctx.save()
        ctx.transform(cam.matrix())
        ctx.scale(1 / PATH_SCALE, 1 / PATH_SCALE)
        for (bx0, by0, bx1, by1), path in self.levels[li]:
            if bx1 < x0 or bx0 > x1 or by1 < y0 or by0 > y1:
                continue
            ctx.append_path(path)
        ctx.restore()


def ring_path(ctx, cam, pts_lonlat, close=True):
    """Build a device-space path from a lon/lat polyline."""
    first = True
    for lon, lat in pts_lonlat:
        x, y = cam.to_screen(lon, lat)
        if first:
            ctx.move_to(x, y)
            first = False
        else:
            ctx.line_to(x, y)
    if close:
        ctx.close_path()


def island_ring(levels, lon, lat):
    x, y = merc(lon, lat)
    best = None
    for bbox, xy in levels[0]:
        if bbox[0] <= x <= bbox[2] and bbox[1] <= y <= bbox[3]:
            area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
            if best is None or area < best[0]:
                best = (area, xy)
    return best[1] if best else None
