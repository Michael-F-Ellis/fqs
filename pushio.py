#!/usr/bin/env python

# Untracked script to update website. It copies fqs.html to michael-f-ellis.github.io
# repository and pushes to the github remote

import shutil
import os
import subprocess

# Copy fqs.html, fqs.js, fqs.css to ../michael-f-ellis.github.io/fqs/
sources = ("abc2fqs.js", "abc2fqs.test.js", "abcjs-basic.js", "abcjs-editor.html",
	"fqs.html", "fqs.js", "fqs.css", "reference.fqs")
destinationdir = "../michael-f-ellis.github.io/fqs/"

# Ensure destination directory exists
os.makedirs(os.path.dirname(destinationdir), exist_ok=True)

# Copy the files
for source in sources:
	shutil.copy2(source, destinationdir)

print("Copied files to " + destinationdir)

# Change to the destination directory
os.chdir("../michael-f-ellis.github.io")

print("Changed directory to " + os.getcwd())
targets = ["fqs/"+s for s in sources]
print(targets)

# Git commands
subprocess.run(["git", "add"] + targets) 
subprocess.run(["git", "commit", "-m", "Update fqs sources"])
subprocess.run(["git", "push"])

