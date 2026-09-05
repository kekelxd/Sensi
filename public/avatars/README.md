# XENSI avatar assets

The original `xensi-cats.png`, `xensi-dogs.png`, and `xensi-hamsters.png`
photocards are each 1254 x 1254 pixels. They are not regular sprite grids: a
large illustration occupies the top-left area and the remaining poses use
different visual bounds.

`scripts/generate_avatars.py` records one measured bounding box per avatar,
then fits each crop proportionally inside a 512 x 512 canvas. It writes 21
deterministic files to `individual/` and builds `avatar-contact-sheet.png`
from those generated files for visual inspection.

Run from the repository root:

```powershell
python scripts/generate_avatars.py
```

The source art is never resized before cropping, and generated illustrations
are never stretched or regenerated.
