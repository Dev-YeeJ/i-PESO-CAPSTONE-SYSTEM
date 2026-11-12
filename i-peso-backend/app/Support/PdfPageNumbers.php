<?php

namespace App\Support;

use Barryvdh\DomPDF\PDF;

/**
 * dompdf can't resolve a CSS total-pages counter (counter(pages) prints 0), so
 * the official report templates leave room at the right end of their fixed
 * footer and this stamps "Page X of Y" there on every page after layout.
 */
class PdfPageNumbers
{
    public static function stamp(PDF $pdf): PDF
    {
        $pdf->render();

        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $font = $dompdf->getFontMetrics()->getFont('DejaVu Sans');

        $canvas->page_text(
            $canvas->get_width() - 54,
            $canvas->get_height() - 18,
            'Page {PAGE_NUM} of {PAGE_COUNT}',
            $font,
            5,
            [0.39, 0.45, 0.55],
        );

        return $pdf;
    }
}
