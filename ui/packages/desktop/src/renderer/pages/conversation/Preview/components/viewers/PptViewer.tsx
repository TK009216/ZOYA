/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import OfficeWatchViewer from './OfficeWatchViewer';

interface PptViewerProps {
  file_path?: string;
  content?: string;
  workspace?: string;
}

const PptViewer: React.FC<PptViewerProps> = (props) => <OfficeWatchViewer docType='ppt' {...props} />;

export default PptViewer;
