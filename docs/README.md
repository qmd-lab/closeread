# Closeread documentation website

To render the site, you first need to copy an up-to-date version of the extension into the `docs` project. From the `docs` directory, run:

```bash
# mkdir -p _extensions/
cp -Rf ../_extensions/closeread _extensions/ && quarto render
quarto preview
```