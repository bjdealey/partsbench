# Unified Workbench — wireframe sources

Low-fi wireframes for [`../unified-workbench.md`](../unified-workbench.md). Published canvas:
<https://claude.ai/code/artifact/416bc689-2bbb-4076-a551-add4d7853302>

Each `*.dc.html` is one artboard (Claude Design Component format); `canvas.json` lays them out into two pages — **Workbench & selection** and **Flows**.

| File | Shows |
|------|-------|
| `Main.dc.html` | The Workbench, nothing selected → page settings + shared Theme |
| `SingleSelected.dc.html` | One node selected → Content / Appearance / Behaviour / Layout + theme chip |
| `ContainerSelected.dc.html` | A Container (stack) selected → stack controls + Publish; left rail on Outline |
| `MultiSelected.dc.html` | Multi-select → common-prop intersection + align/distribute + bulk span |
| `DragAndLibrary.dc.html` | Drag-to-place from the Library with a grid drop indicator |
| `MyLibraryAndPublish.dc.html` | The My Library open/import/publish surface |
| `Mobile.dc.html` | < 900px region tabs; `minSpan` full-width collapse |

These are structural mockups, not the app — they intentionally reuse PartsBench's dark chrome tokens but render nodes as labelled placeholders. They are the source of record for the published canvas; the seeded `.html` payload (the baked editor, ~2 MiB) is not committed.
