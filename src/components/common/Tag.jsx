import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';

export const Tag = ({ bg, color, children }) => (
  <span style={css.tag(bg, color)}>{children}</span>
);

export const GroupTag = ({ type, children }) => {
  const map = { all: [T.al, T.ad], adults: [T.blueL, T.blue], older: [T.pinkL, T.pink], younger: [T.coralL, T.coral], kids: [T.pinkL, T.pink] };
  const [bg, c] = map[type] || map.all;
  return <span style={{ ...css.tag(bg, c), fontSize: 10, padding: "2px 8px" }}>{children}</span>;
};
