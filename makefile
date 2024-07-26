fqs.html: reference.fqs
	@sed -i '/cheatsheet: `/,/`/c\        cheatsheet: `$$(cat reference.fqs)`' fqs.html
	@echo "Cheatsheet updated successfully."
