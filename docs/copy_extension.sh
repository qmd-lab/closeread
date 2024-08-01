#!/bin/bash

# Copy the extension only on full render, not preview
if [ "$QUARTO_PROJECT_RENDER_ALL" = 1 ]; then
    mkdir -p _extensions/
    cp -Rf ../_extensions/closeread _extensions/
    echo "> closeread extension retrieved"
fi
