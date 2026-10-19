"""Region tools for the Warwrit art lane: crop, paste, diff.

crop  <image> <x0> <y0> <x1> <y1> <scale> <out>
paste <base> <edit> <x0> <y0> <x1> <y1> <border_fraction> <feather_px> <out>
      (edit is resized to the box; the outer border fraction keeps the base,
       except along image edges)
diff  <a> <b>   -> prints the bounding box of changed pixels
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter


def crop(src, x0, y0, x1, y1, scale, out):
    image = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
    image.resize((image.width * scale, image.height * scale), Image.LANCZOS).save(out)


def paste(base_path, edit_path, x0, y0, x1, y1, border, feather, out):
    base = Image.open(base_path).convert("RGB")
    width, height = x1 - x0, y1 - y0
    edit = Image.open(edit_path).convert("RGB").resize((width, height), Image.LANCZOS)
    bx, by = int(width * border), int(height * border)
    left = 0 if x0 == 0 else bx
    top = 0 if y0 == 0 else by
    right = width if x1 >= base.width else width - bx
    bottom = height if y1 >= base.height else height - by
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rectangle((left, top, right, bottom), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    region = base.crop((x0, y0, x1, y1))
    base.paste(Image.composite(edit, region, mask), (x0, y0))
    base.save(out)


def diff(a, b):
    print(ImageChops.difference(Image.open(a).convert("RGB"), Image.open(b).convert("RGB")).getbbox())


if __name__ == "__main__":
    command, *args = sys.argv[1:]
    if command == "crop":
        crop(args[0], *map(int, args[1:6]), args[6])
    elif command == "paste":
        paste(args[0], args[1], *map(int, args[2:6]), float(args[6]), int(args[7]), args[8])
    elif command == "diff":
        diff(args[0], args[1])
    else:
        sys.exit(__doc__)
