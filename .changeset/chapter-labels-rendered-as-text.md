---
"pod": patch
---

Chapter titles in the episode sidebar are now rendered as text rather than markup. A title containing `<`, `&` or a quote used to be parsed as HTML — so `Q&A` could come out mangled, and a title crafted to open an HTML tag could get that tag built into the page, because the surrounding template supplied the `>` needed to close it. Chapter titles now display verbatim, whatever characters they contain.
