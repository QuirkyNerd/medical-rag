#!/usr/bin/env python3
"""
Create a sample medical PDF for testing the RAG system.
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os

def create_sample_medical_pdf():
    """Create a sample medical PDF for testing."""
    
    # Check if reportlab is available
    try:
        from reportlab.lib.pagesizes import letter
    except ImportError:
        print("reportlab not available. Creating a simple text file instead.")
        return create_simple_text_file()
    
    filename = "sample_medical_book.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
    )
    
    story = []
    
    # Read the content from our text file
    with open('sample_medical_book.txt', 'r') as f:
        content = f.read()
    
    # Split content into sections
    sections = content.split('\n\n')
    
    for section in sections:
        if not section.strip():
            continue
            
        lines = section.split('\n')
        first_line = lines[0].strip()
        
        # Check if it's a main title or chapter
        if first_line.startswith('Medical Knowledge') or first_line.startswith('Chapter'):
            story.append(Paragraph(first_line, title_style))
            story.append(Spacer(1, 12))
            
            # Add remaining lines
            for line in lines[1:]:
                if line.strip():
                    story.append(Paragraph(line.strip(), styles['Normal']))
                    story.append(Spacer(1, 6))
        
        # Check if it's a heading (all caps or contains ':')
        elif first_line.isupper() or ':' in first_line:
            story.append(Paragraph(first_line, heading_style))
            story.append(Spacer(1, 6))
            
            # Add remaining lines
            for line in lines[1:]:
                if line.strip():
                    story.append(Paragraph(line.strip(), styles['Normal']))
                    story.append(Spacer(1, 6))
        
        else:
            # Regular content
            for line in lines:
                if line.strip():
                    story.append(Paragraph(line.strip(), styles['Normal']))
                    story.append(Spacer(1, 6))
        
        story.append(Spacer(1, 12))
    
    # Build PDF
    doc.build(story)
    print(f"✅ Created sample medical PDF: {filename}")
    return filename

def create_simple_text_file():
    """Fallback: just use the text file directly."""
    filename = "sample_medical_book.txt"
    print(f"✅ Using text file for testing: {filename}")
    return filename

if __name__ == "__main__":
    create_sample_medical_pdf()