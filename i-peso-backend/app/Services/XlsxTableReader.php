<?php

namespace App\Services;

use Generator;
use RuntimeException;
use SimpleXMLElement;
use XMLReader;
use ZipArchive;

class XlsxTableReader
{
    private const MAIN_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    public function rows(string $path): Generator
    {
        if (! is_file($path) || ! is_readable($path)) {
            throw new RuntimeException("XLSX file is not readable: {$path}");
        }

        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new RuntimeException("XLSX file could not be opened: {$path}");
        }

        try {
            $sharedStrings = $this->sharedStrings($zip);
            $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
            if ($sheetXml === false) {
                throw new RuntimeException("The first worksheet is missing from: {$path}");
            }

            $reader = new XMLReader;
            $reader->XML($sheetXml, null, LIBXML_NONET | LIBXML_COMPACT);
            $header = null;

            while ($reader->read()) {
                if ($reader->nodeType !== XMLReader::ELEMENT || $reader->localName !== 'row') {
                    continue;
                }

                $values = $this->rowValues(
                    new SimpleXMLElement($reader->readOuterXml()),
                    $sharedStrings
                );

                if ($header === null) {
                    $header = array_map(fn ($value) => trim((string) $value), $values);

                    continue;
                }

                if ($values === [] || collect($values)->every(fn ($value) => $value === '')) {
                    continue;
                }

                yield array_combine(
                    $header,
                    array_slice(array_pad($values, count($header), ''), 0, count($header))
                );
            }

            $reader->close();
        } finally {
            $zip->close();
        }
    }

    private function sharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');
        if ($xml === false) {
            return [];
        }

        $document = new SimpleXMLElement($xml);
        $document->registerXPathNamespace('x', self::MAIN_NAMESPACE);

        return array_map(
            function (SimpleXMLElement $item) {
                $children = $item->children(self::MAIN_NAMESPACE);
                if (isset($children->t)) {
                    return (string) $children->t;
                }

                $parts = [];
                foreach ($children->r as $run) {
                    $parts[] = (string) $run->children(self::MAIN_NAMESPACE)->t;
                }

                return implode('', $parts);
            },
            $document->xpath('//x:si') ?: []
        );
    }

    private function rowValues(SimpleXMLElement $row, array $sharedStrings): array
    {
        $row->registerXPathNamespace('x', self::MAIN_NAMESPACE);
        $values = [];

        foreach ($row->xpath('./x:c') ?: [] as $cell) {
            $reference = (string) $cell['r'];
            $column = $this->columnIndex($reference);
            $type = (string) $cell['t'];
            $children = $cell->children(self::MAIN_NAMESPACE);
            $value = (string) ($children->v ?? '');

            if ($type === 's' && $value !== '') {
                $value = $sharedStrings[(int) $value] ?? '';
            } elseif ($type === 'inlineStr') {
                $value = (string) ($children->is->t ?? '');
            }

            $values[$column] = trim($value);
        }

        if ($values === []) {
            return [];
        }

        return array_map(
            fn ($index) => $values[$index] ?? '',
            range(0, max(array_keys($values)))
        );
    }

    private function columnIndex(string $reference): int
    {
        preg_match('/^[A-Z]+/i', $reference, $matches);
        $letters = strtoupper($matches[0] ?? 'A');
        $index = 0;

        foreach (str_split($letters) as $letter) {
            $index = ($index * 26) + (ord($letter) - 64);
        }

        return $index - 1;
    }
}
