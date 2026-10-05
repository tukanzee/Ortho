# Wrist / Hand Bone Model Attribution

The files in `bones/` are generated from individual BodyParts3D STL structures.

Source data mirror used for this milestone:

```text
https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
```

Reference conversion approach inspected:

```text
https://github.com/paulvanmetre/anatomy-viewer
```

## Source Data

BodyParts3D is copyright The Database Center for Life Science and is licensed
under Creative Commons Attribution-Share Alike 2.1 Japan.

## Local Generation

Generated output path:

```text
web/public/models/wrist/bones/*.glb
```

Generation script:

```text
web/scripts/generate-wrist-bones.mjs
```

Each generated GLB uses the same transform:

- scale BodyParts3D millimetres to metres: `0.001`
- rotate from BodyParts3D Z-up into Three.js Y-up: `-90 degrees` around X
- preserve shared anatomical coordinates
- do not recenter individual bones

No Blender processing or manual anatomical modelling was used.

## Legacy File

`source_skeleton.glb` was copied from BodyExplorer during an earlier experiment.
The current application no longer loads it.
