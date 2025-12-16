---
sidebar_position: 7
sidebar_label: Styling
---

# Styling

GTKX provides `@gtkx/css` for CSS-in-JS styling, similar to Emotion. GTK widgets can be styled using CSS, and GTKX makes it easy to create and apply custom styles.

## Installation

```bash
npm install @gtkx/css
```

## Basic Usage

Use the `css` template literal to create style classes:

```tsx
import { css } from "@gtkx/css";
import { Button } from "@gtkx/react";

const primaryButton = css`
  padding: 16px 32px;
  border-radius: 24px;
  background: #3584e4;
  color: white;
  font-weight: bold;
`;

const MyButton = () => <Button label="Click me" cssClasses={[primaryButton]} />;
```

The `css` function returns a unique class name that you pass to the `cssClasses` prop.

## Combining Styles

Use `cx` to combine multiple style classes:

```tsx
import { css, cx } from "@gtkx/css";

const baseButton = css`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
`;

const successButton = css`
  background: #33d17a;
  color: white;
`;

const dangerButton = css`
  background: #e01b24;
  color: white;
`;

// Combine base with variant
<Button cssClasses={[cx(baseButton, successButton)]} label="Success" />
<Button cssClasses={[cx(baseButton, dangerButton)]} label="Danger" />
```

## Global Styles

Use `injectGlobal` for global CSS that applies across your app:

```tsx
import { injectGlobal } from "@gtkx/css";

injectGlobal`
  window {
    background: #fafafa;
  }

  button {
    transition: background 200ms ease;
  }

  button:hover {
    filter: brightness(1.1);
  }
`;
```

## Example: Custom Button Styles

```tsx
import { css, cx } from "@gtkx/css";
import { Button, Box } from "@gtkx/react";
import { Orientation } from "@gtkx/ffi/gtk";

const baseButton = css`
  padding: 16px 32px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: bold;
  transition: all 200ms ease;
`;

const successStyle = css`
  background: #33d17a;
  color: white;

  &:hover {
    background: #2ec27e;
  }
`;

const warningStyle = css`
  background: #f5c211;
  color: #3d3846;

  &:hover {
    background: #e5a50a;
  }
`;

const gradientStyle = css`
  background: linear-gradient(135deg, #3584e4, #9141ac);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #1c71d8, #813d9c);
  }
`;

const ButtonShowcase = () => (
  <Box orientation={Orientation.HORIZONTAL} spacing={12}>
    <Button label="Success" cssClasses={[cx(baseButton, successStyle)]} />
    <Button label="Warning" cssClasses={[cx(baseButton, warningStyle)]} />
    <Button label="Gradient" cssClasses={[cx(baseButton, gradientStyle)]} />
  </Box>
);
```
