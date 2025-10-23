# Polygon utilities - intersection, IoU, etc.

from typing import List, Tuple
from shapely.geometry import Polygon, box
import numpy as np

def polygon_from_points(points: List[List[float]]) -> Polygon:
    """Create a Shapely polygon from a list of points."""
    return Polygon(points)

def bbox_to_polygon(bbox: List[float]) -> Polygon:
    """Convert a bounding box [x, y, w, h] to a Shapely polygon."""
    x, y, w, h = bbox
    return box(x, y, x + w, y + h)

def calculate_intersection_area(poly1: Polygon, poly2: Polygon) -> float:
    """Calculate the area of intersection between two polygons."""
    if not poly1.intersects(poly2):
        return 0.0
    return poly1.intersection(poly2).area

def calculate_iou(poly1: Polygon, poly2: Polygon) -> float:
    """
    Calculate the Intersection over Union (IoU) of two polygons.
    IoU = Area of Intersection / Area of Union
    """
    intersection = calculate_intersection_area(poly1, poly2)
    if intersection == 0:
        return 0.0
    
    union = poly1.area + poly2.area - intersection
    return intersection / union if union > 0 else 0.0

def calculate_overlap_ratio(bbox_poly: Polygon, slot_poly: Polygon) -> float:
    """
    Calculate the overlap ratio of a bounding box polygon over a slot polygon.
    Overlap Ratio = Area of Intersection / Area of Slot
    """
    intersection = calculate_intersection_area(bbox_poly, slot_poly)
    if slot_poly.area == 0:
        return 0.0
    return intersection / slot_poly.area

def point_in_polygon(point: Tuple[float, float], polygon: Polygon) -> bool:
    """Check if a point (x, y) is inside a given polygon."""
    from shapely.geometry import Point
    return polygon.contains(Point(point))

def transform_bbox_homography(bbox: List[float], H:np.ndarray) -> List[float]:
    """
    Transform a bounding box using a homography matrix H.
    args:
        bbox: [x, y, w, h]
        H: 3x3 homography matrix
    returns:
        Transformed bounding box [x', y', w', h']
    """
    x, y, w, h = bbox

    # 4 corners of the bounding box
    corners = np.array([
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h]
    ], dtype='float32')

    # Convert to homogeneous coordinates
    ones = np.ones((4,1))
    corners_homogeneous = np.hstack([corners, ones])  # Shape (4, 3)

    # Apply homography
    transformed = (H @ corners_homogeneous.T).T # Shape (4, 3)
    transformed = transformed[:, :2] / transformed[:, 2:3]

    # get new bounding box
    x_min = np.min(transformed[:, 0])
    y_min = np.min(transformed[:, 1])
    x_max = np.max(transformed[:, 0])
    y_max = np.max(transformed[:, 1])

    return [float(x_min), float(y_min), float(x_max - x_min), float(y_max - y_min)]