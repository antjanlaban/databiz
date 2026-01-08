# Accessibility Standards (a11y)

> **Standard**: WCAG 2.1 Level AA
> **Philosophy**: "Inclusive by Default" - Accessibility is not a feature, it's a requirement.

---

## 1. Compliance Level
We adhere to **WCAG 2.1 Level AA** standards.
This means our application must be:
1.  **Perceivable**: Information and UI components must be presentable to users in ways they can perceive.
2.  **Operable**: User interface components and navigation must be operable.
3.  **Understandable**: Information and the operation of user interface must be understandable.
4.  **Robust**: Content must be robust enough that it can be interpreted reliably by a wide variety of user agents, including assistive technologies.

---

## 2. Focus Indicators
We do **NOT** rely on default browser focus rings, as they are often inconsistent or hard to see.
We use a **Custom High-Contrast Focus Ring**.

### Implementation (Tailwind)
All interactive elements (buttons, links, inputs) must have a visible focus state:

```html
<!-- Standard Focus Ring -->
<button class="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
  Action
</button>
```

*   **Ring Width**: 2px minimum.
*   **Offset**: 2px (to ensure contrast against the element itself).
*   **Color**: Primary Brand Color (or High Contrast equivalent).

---

## 3. Screen Reader Support
We prioritize **Semantic HTML** over ARIA. ARIA is used only when HTML5 elements are insufficient.

### Semantic Hierarchy
*   Use `<main>` for the primary content.
*   Use `<nav>` for navigation menus.
*   Use `<aside>` for sidebars.
*   Use `<h1>` through `<h6>` in logical order (no skipping levels).
*   Use `<button>` for actions, `<a>` for navigation.

### ARIA Usage
*   **Labels**: Use `aria-label` or `aria-labelledby` for icon-only buttons.
*   **State**: Use `aria-expanded` or `aria-pressed` to communicate state.
*   **Feedback**: Use `role="alert"` for dynamic error messages.

---

## 4. Motion & Animation
We respect the user's operating system preference for reduced motion.

### Implementation
Use Tailwind's `motion-safe` and `motion-reduce` modifiers.

```html
<!-- Only animate if user hasn't requested reduced motion -->
<div class="motion-safe:transition-all motion-reduce:transition-none">
  ...
</div>
```

*   **Essential Animation**: Loading spinners are allowed but should not flash rapidly.
*   **Decorative Animation**: Must be disabled when `prefers-reduced-motion: reduce` is active.

---

## 5. Color Contrast
*   **Text**: Minimum 4.5:1 contrast ratio against background.
*   **Large Text**: Minimum 3:1 contrast ratio.
*   **UI Components**: Borders and icons essential for understanding must have 3:1 contrast.

> **Agent Rule**: Always verify color combinations using a contrast checker before finalizing a component design.
