#!/usr/local/bin/python
import sys
from PyPDF2 import PdfWriter, PdfReader

if __name__ == "__main__":
    # take first arg as the input file
    input_file = sys.argv[1]
    # second arg is a text file with the table of contents
    toc_file = sys.argv[2]

    # Open the PDF
    reader = PdfReader(input_file)
    writer = PdfWriter()

    # Copy pages from reader to writer
    for page in reader.pages:
        writer.add_page(page)

    # Create the table of contents
    # Read each non-empty line from the toc_file
    # The first line is the page number, the second is the title
    with open(toc_file, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                page_number, title = line.split(" ",1)
                writer.add_outline_item(title, int(page_number)-1)

    # Save the new PDF with table of contents
    with open("output.pdf", "wb") as output_file:
        writer.write(output_file)
