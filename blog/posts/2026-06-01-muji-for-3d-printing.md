---
title: Muji for 3D printing
date: 2026-06-02
---

A library of minimal, parametric designs for the home. I've always wanted this to exist.

Consumer desktop 3D printing has finally become mainstream. I've met a 73-year old woman who owns a 3D printer and dads printing toys with their kids. There are plenty of amazing designs out there. But browsing for them sucks up time and creative energy. I just want that calm sense of organization you feel when walking into a Muji store. There are some things a marketplace will never achieve.

So I finally built it. First version alpha link: **[yuniku-gamma.vercel.app](https://yuniku-gamma.vercel.app)**.


I've made 8 designs so far. Pick an object, adjust a few parameters, and download the 3D file. No infinite scroll, no likes, no tags-of-tags.

I made the whole thing with Claude Code, including all the 3D modeling. I never opened a CAD program. Sometimes Claude would get a design almost right away. Sometimes I would have to guide it step by step.  Each design is 1 page of code, it's amazing how concisely it captures so much variation. The stack is plain functional CAD primitives composed in JavaScript, which turns out to be a beautiful way to think about objects. Each design is around one page of code, and it's amazing how concisely that captures so much variation.

Physical objects as code has been quietly enlightening on its own. It takes 1-2 hours to make a parametric design. I spend time thinking about when to add more parameters or when to split off a new design. I also wonder if the variation of household objects is more finite than it first seems. How many parametric designs would I need to create to achieve the feeling of a whole catalog?

A library of a few dozen products seems very doable. Printing, testing, refining takes longer. I built most of this across 3 days. A bit of a giddy sprint because it was so easy to make designs.

Now the real test is whether I'll use these things myself. I'm hoping a few friends will join in and test prints too — if you have a printer and want to try one, send me a note.
