# Unit tests for polygon utilities
import pytest
from app.utils.polygon_utils import (
    polygon_from_points,
    bbox_to_polygon,
    calculate_iou,
    calculate_overlap_ratio
)

def test_bbox_to_polygon():
    bbox = [0, 0, 10, 10]
    poly = bbox_to_polygon(bbox)
    assert poly.area == 100

def test_iou_full_overlap():
    poly1 = bbox_to_polygon([0, 0, 10, 10])
    poly2 = bbox_to_polygon([0, 0, 10, 10])
    iou = calculate_iou(poly1, poly2)
    assert iou == 1.0

def test_iou_partial_overlap():
    poly1 = bbox_to_polygon([0, 0, 10, 10])
    poly2 = bbox_to_polygon([5, 5, 10, 10])
    iou = calculate_iou(poly1, poly2)
    # Intersection = 25, Union = 100 + 100 - 25 = 175
    expected = 25 / 175
    assert abs(iou - expected) < 0.01

def test_overlap_ratio():
    slot_poly = polygon_from_points([[0, 0], [20, 0], [20, 20], [0, 20]])
    bbox_poly = bbox_to_polygon([5, 5, 10, 10])
    ratio = calculate_overlap_ratio(bbox_poly, slot_poly)
    # Intersection = 100, Slot area = 400
    assert abs(ratio - 0.25) < 0.01