#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Tingkai liu.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..ipyneugraph import NeuGraphWidget


def test_example_creation_blank():
    w = NeuGraphWidget()
    assert w.value == 'Hello World'
