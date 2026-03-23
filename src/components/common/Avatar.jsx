import React from 'react';
import { css } from '../../styles/shared';

export const Avatar = ({ bg, label, size = 32, style = {} }) => (
  <div style={{ ...css.avatar(bg, size), ...style }}>{label}</div>
);
