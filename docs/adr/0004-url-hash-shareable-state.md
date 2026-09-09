# Scene state lives in the URL hash

A scene — the current Component plus its Values, or a whole Composition plus its Theme — must survive a reload and a pasted link. It is encoded into the URL hash: Component mode stores only the diffs from manifest defaults as a base64 payload; Compose mode encodes the Composition under a `compose` hash prefix. A reload or a shared link therefore restores the exact scene, with no backend and nothing phoning home.

## Considered options

- **localStorage** — rejected: not shareable via a link.
- **A backend / persistence service** — rejected: breaks the local-and-offline constraint.

## Consequences

- State is shareable and offline, with no persistence layer.
- Non-shareable UI preferences (pane sizes) are the deliberate exception: they live in `localStorage` and are kept out of the hash.
