#!/usr/local/bin/python
import sys
from PyPDF2 import PdfWriter, PdfReader

if __name__ == "__main__":
    # take first arg as the input file
    input_file = sys.argv[1]
     

    # Open the PDF
    reader = PdfReader("input_file")
    writer = PdfWriter()

    # Copy pages from reader to writer
    for page in reader.pages:
        writer.add_page(page)

    # Create the table of contents
    writer.add_outline_item("Chapter 1", 0)  # Links to first page
    writer.add_outline_item("Chapter 2", 1)  # Links to second page
    writer.add_outline_item("Chapter 3", 2)  # Links to third page

    # Save the new PDF with table of contents
    with open("output.pdf", "wb") as output_file:
        writer.write(output_file)
