#!/usr/bin/env python3
"""
Deployment script for the FQS web application.

This script automates the deployment process by:
1. Copying all source files to the GitHub Pages repository
2. Committing the changes 
3. Pushing to GitHub which triggers the site update

The script copies:
- Individual top-level files specified in the sources tuple
- The complete src/ directory tree containing modules and components
- Preserves the directory structure in the destination

Target repository: michael-f-ellis.github.io
Target directory: fqs/
"""

import shutil
import os
import subprocess

# Top level files to copy
sources = ("abc2fqs.js", "abc2fqs.test.js", "abcjs-basic.js", "abcjs-editor.html",
	"fqs.html", "fqs.js", "fqs.css", "reference.fqs",
	"ytpdf.html", "ytpdf.js")
destinationdir = "../michael-f-ellis.github.io/fqs/"

# Ensure destination directory exists
os.makedirs(destinationdir, exist_ok=True)

# Copy individual files
for source in sources:
	shutil.copy2(source, destinationdir)

# Copy src directory recursively
src_dir = "src"
dest_src_dir = os.path.join(destinationdir, "src")
shutil.copytree(src_dir, dest_src_dir, dirs_exist_ok=True)

print("Copied files and src directory to " + destinationdir)

# Change to the destination directory
os.chdir("../michael-f-ellis.github.io")
print("Changed directory to " + os.getcwd())

# Get list of all copied files for git
top_level_targets = ["fqs/"+s for s in sources]
src_targets = ["fqs/src"]
all_targets = top_level_targets + src_targets

# Git commands
subprocess.run(["git", "add"] + all_targets)
subprocess.run(["git", "commit", "-m", "Update fqs sources"])
subprocess.run(["git", "push"])
