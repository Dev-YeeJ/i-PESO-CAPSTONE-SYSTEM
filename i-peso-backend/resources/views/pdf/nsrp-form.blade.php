<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NSRP Form 1 - {{ $form['name']['surname'] }}, {{ $form['name']['first'] }}</title>
{{--
    DOLE NSRP Form 1 (September 2020) — Jobseeker Registration Form, 2 pages, A4 portrait.

    Drawn on a fixed A4 canvas (595 x 842 pt) with absolutely positioned lines, labels and boxes,
    so the official layout never reflows. Every coordinate is in points, measured from scans of
    the printed form; the frame runs from x = 36 to x = 559. Filled-in values come from
    App\Support\Nsrp\NsrpFormData and are shrunk to fit their cell, never allowed to move it.

    Fonts: form text uses Helvetica (closest built-in match to the form's typeface; bold is
    700 only, so no faux weights fall back to a serif font). Values and tick marks use DejaVu
    Sans, which covers ñ, accents and the ✓ glyph.
--}}
<style>
    @page { size: A4 portrait; margin: 0; }
    * { margin: 0; padding: 0; }
    body { font-family: Helvetica, Arial, sans-serif; color: #000; }
    .page { position: relative; width: 595pt; height: 841pt; overflow: hidden; page-break-after: always; }
    .page.last { page-break-after: auto; }
    .h { position: absolute; height: 0; border-top: 0.75pt solid #000; }
    .h.dash { border-top: 0.6pt dashed #000; }
    .h.dot { border-top: 1pt dotted #000; }
    .v { position: absolute; width: 0; border-left: 0.75pt solid #000; }
    .t { position: absolute; line-height: 1.2; white-space: nowrap; }
    .t.wrap { white-space: normal; }
    .b { font-weight: bold; }
    .val { position: absolute; overflow: hidden; font-family: "DejaVu Sans", sans-serif; }
    .cb { position: absolute; border: 0.7pt solid #000; text-align: center; font-family: "DejaVu Sans", sans-serif; font-weight: bold; }
    .mark { position: absolute; text-align: center; font-family: "DejaVu Sans", sans-serif; font-weight: bold; }
    .para { position: absolute; line-height: 1.38; text-align: justify; white-space: normal; }
</style>
</head>
<body>
@php
    $n = static fn (float $v): string => rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.');

    // Lines
    $h = static fn (float $x1, float $x2, float $y, string $cls = '') => '<div class="h '.$cls.'" style="left:'.$n($x1).'pt;top:'.$n($y).'pt;width:'.$n($x2 - $x1).'pt"></div>';
    $v = static fn (float $x, float $y1, float $y2) => '<div class="v" style="left:'.$n($x).'pt;top:'.$n($y1).'pt;height:'.$n($y2 - $y1).'pt"></div>';

    // Printed form text, vertically centred on $yc. <br> makes extra lines.
    $t = static function (float $x, float $yc, string $html, float $size = 7.5, string $cls = '', ?float $w = null, string $align = 'left') use ($n): string {
        $lines = substr_count($html, '<br>') + 1;
        $style = 'left:'.$n($x).'pt;top:'.$n($yc - $lines * $size * 0.6).'pt;font-size:'.$n($size).'pt;';
        if ($w !== null) {
            $style .= 'width:'.$n($w).'pt;text-align:'.$align.';';
        }

        return '<div class="t '.$cls.'" style="'.$style.'">'.$html.'</div>';
    };
    $tc = static fn (float $x1, float $x2, float $yc, string $html, float $size = 7.5, string $cls = 'b') => $t($x1, $yc, $html, $size, $cls, $x2 - $x1, 'center');

    // A filled-in value, shrunk to fit $w (and wrapped onto up to $maxLines lines) — never overflowing.
    // Real text widths from DomPDF's own font metrics (falls back to an estimate if unavailable).
    $metrics = null;
    $dejaVu = null;
    try {
        $metrics = app('dompdf')->getFontMetrics();
        $dejaVu = $metrics->getFont('DejaVu Sans', 'normal');
    } catch (\Throwable) {
        $metrics = null;
    }
    if ($dejaVu === null) {
        $metrics = null;
    }

    // $maxH: the cell's height — wrapped text is shrunk until all of its lines fit in it.
    $val = static function (float $x, float $yc, float $w, $text, float $size = 7.5, string $align = 'left', int $maxLines = 1, float $min = 4.2, float $maxH = 0) use ($n, $metrics, $dejaVu): string {
        $text = trim((string) $text);
        if ($text === '') {
            return '';
        }
        $len = max(1, mb_strlen($text));
        $upper = preg_match_all('/\p{Lu}/u', $text) / $len;
        $em = 0.56 + 0.14 * $upper; // DejaVu Sans average advance per character, in em (estimate)
        if ($metrics !== null) {
            $em = $metrics->getTextWidth($text, $dejaVu, 10) / 10 / $len; // exact, from DomPDF's font metrics
        }
        // Measured DomPDF behaviour for DejaVu Sans with line-height 1.0: the first baseline sits
        // 1.025 x size below the box top, and wrapped lines are 1.28 x size apart. Capitals are
        // 0.73 em tall and descenders 0.24 em deep.
        $first = 1.025;
        $step = 1.28;
        $width = static fn (float $s) => $len * $em * $s;

        $lines = 1;
        if ($width($size) > $w) {
            if ($maxLines > 1) {
                $lines = min($maxLines, (int) ceil($width($size) / $w));
                $size = min($size, $w * $lines * 0.8 / ($len * $em)); // 0.8: slack for word wrapping
                if ($maxH > 0) {
                    // Cap tops of line 1 to descenders of the last line must fit in the cell.
                    $size = min($size, ($maxH - 1.5) / (($lines - 1) * $step + 0.97));
                }
                if ($width($size) <= $w * 0.95) {
                    $lines = 1; // shrinking made it fit on one line after all
                }
            } else {
                $size = $w / ($len * $em);
            }
        }
        $size = max($min, $size);

        // Middle of the capitals (of the whole block) on $yc; room kept below for descenders.
        $top = $yc + 0.365 * $size - $first * $size - ($lines - 1) * $step * $size / 2;
        $height = ($first + ($lines - 1) * $step + 0.3) * $size;
        $style = 'left:'.$n($x).'pt;top:'.$n($top).'pt;width:'.$n($w).'pt;height:'.$n($height).'pt;'
            .'font-size:'.$n($size).'pt;line-height:1;text-align:'.$align.';white-space:'.($lines > 1 ? 'normal' : 'nowrap').';';

        return '<div class="val" style="'.$style.'">'.e($text).'</div>';
    };
    $valc = static fn (float $x1, float $x2, float $yc, $text, float $size = 7.5, int $maxLines = 1, float $maxH = 0) => $val($x1 + 1.5, $yc, $x2 - $x1 - 3, $text, $size, 'center', $maxLines, 4.2, $maxH);
    $vall = static fn (float $x1, float $x2, float $yc, $text, float $size = 7.5, int $maxLines = 1, float $maxH = 0) => $val($x1 + 3, $yc, $x2 - $x1 - 5, $text, $size, 'left', $maxLines, 4.2, $maxH);

    // Checkbox (square with a ✓ when on), centred vertically on $yc; $x is its left edge.
    $cb = static fn (float $x, float $yc, $on, float $s = 7.2) => '<div class="cb" style="left:'.$n($x).'pt;top:'.$n($yc - $s / 2).'pt;width:'.$n($s).'pt;height:'.$n($s).'pt;font-size:'.$n($s + 0.6).'pt;line-height:'.$n($s).'pt;">'.($on ? '&#10003;' : '').'</div>';
    // A ✓ with no box (the language grid has plain cells).
    $mark = static fn (float $x1, float $x2, float $yc, $on) => $on ? '<div class="mark" style="left:'.$n($x1).'pt;top:'.$n($yc - 5).'pt;width:'.$n($x2 - $x1).'pt;font-size:9pt;line-height:10pt;">&#10003;</div>' : '';
    // A fill-in line with its value written on it.
    $blank = static fn (float $x1, float $x2, float $base, $text = '', float $size = 7) => $h($x1, $x2, $base).$val($x1 + 1.5, $base - $size * 0.62, $x2 - $x1 - 3, $text, $size);

    // Coordinates below were measured from the printed form (both pages scanned, ruled lines
    // detected and converted to points), so the frame, every rule and every divider sit where
    // they are on paper. Frame: x 36.5 to 561.9.
    $L = 36.5;   // frame left
    $R = 561.9;  // frame right
    $section = static fn (float $yc, string $html) => $t($L + 4, $yc, $html, 9.1, 'b');
    $pageNo = static fn (int $page, float $x, float $yc) => $t($x, $yc, 'Page <span class="b">'.$page.'</span> of <span class="b">2</span>', 9.4, 'b');

    $f = $form;
    $emp = $f['employment'];

    // ═════════════════════════════════════════ PAGE 1 ═════════════════════════════════════════
    $p1 = '';

    // Frame and full-width rules
    $p1 .= $v($L, 39.9, 755.3).$v($R, 39.9, 755.3);
    foreach ([39.9, 92.7, 132.5, 146.2, 186.4, 200.4, 268.4, 282.2, 323.2, 336.6, 467.2, 506.8, 525.1, 543.3, 556.9, 578.3, 599.8, 621.5, 643.8, 661.3, 679.7, 697.8, 715.1, 732.8, 755.3] as $y) {
        $p1 .= $h($L, $R, $y);
    }

    // Header
    $p1 .= $v(117.9, 39.9, 92.7);
    $p1 .= $tc($L, 117.9, 55.6, 'NSRP Form 1', 8.8).$tc($L, 117.9, 67.4, 'September', 8.8).$tc($L, 117.9, 80.0, '2020', 8.8);
    $p1 .= $tc(117.9, $R, 46.6, 'Republic of the Philippines', 9.8, '');
    $p1 .= $tc(117.9, $R, 59.1, 'Department of Labor and Employment', 9.8, '');
    $p1 .= $tc(117.9, $R, 72.4, 'NATIONAL SKILLS REGISTRATION PROGRAM', 9.9);
    $p1 .= $tc(117.9, $R, 85.0, 'JOBSEEKER REGISTRATION FORM', 9.9);
    $p1 .= '<div class="para" style="left:40.5pt;top:94.2pt;width:517.5pt;font-size:9.6pt;line-height:11.9pt;"><span class="b">INSTRUCTIONS:</span> Please fill out the form legibly in block letters using a ballpoint pen. Check appropriate boxes. Please do not leave any items unanswered. Indicate &ldquo;NA&rdquo; if not applicable. You may use extra sheet if needed. Submit accomplished form to the Public Employment Service Office (PESO) Manager or Officer in your city/municipality.</div>';

    // I. Personal information — name
    $p1 .= $section(139.35, 'I.PERSONAL INFORMATION');
    $p1 .= $h($L, $R, 173.9, 'dash');
    foreach ([['surname', 38, 114], ['first', 145, 270], ['middle', 280, 405], ['suffix', 425, 560]] as [$key, $x1, $x2]) {
        $p1 .= $valc($x1, $x2, 160.6, $f['name'][$key], 9.5, 2, 22);
    }
    $p1 .= $tc(26, 126, 180.2, 'SURNAME', 8.6).$tc(157.6, 257.6, 180.2, 'FIRST NAME', 8.6).$tc(287.6, 397.6, 180.2, 'MIDDLE NAME', 9).$tc(424.6, 560.6, 180.2, 'SUFFIX (Ex: Sr., Jr., III, etc.)', 8.8);

    // Date of birth
    $p1 .= $t(41, 193.4, '<span class="b">DATE OF BIRTH</span> <span class="b" style="font-size:8.2pt">(mm/dd/yyyy)</span>', 8.6);
    $p1 .= $val(170, 193.4, 200, $f['date_of_birth'], 8);

    // Sex / religion / civil status (left) and present address (right)
    $p1 .= $v(221.9, 200.4, 268.4);
    $p1 .= $h($L, 221.9, 214.3).$h($L, 221.9, 228.0);
    $p1 .= $t(41, 207.35, 'SEX', 8.6, 'b');
    $p1 .= $cb(66.6, 207.35, $f['sex'] === 'male', 7.6).$t(77.5, 207.35, 'Male', 9.6);
    $p1 .= $cb(112.1, 207.35, $f['sex'] === 'female', 7.6).$t(123.0, 207.35, 'Female', 9.6);
    $p1 .= $t(41, 221.15, 'RELIGION', 8.6, 'b').$val(90, 221.15, 129, $f['religion'], 7.5);
    $p1 .= $t(41, 234.9, 'CIVIL', 8.6, 'b').$t(41, 248.8, 'STATUS', 8.6, 'b');
    foreach ([['single', 'Single', 234.9], ['married', 'Married', 248.8], ['widowed', 'Widowed', 262.3]] as [$key, $label, $yc]) {
        $p1 .= $cb(109.6, $yc, $f['civil_status'] === $key, 7.6).$t(121.5, $yc, $label, 9.8);
    }
    if ($f['civil_status'] === 'separated') {
        // Not one of the form's three boxes: written in, as an applicant would.
        $p1 .= $val(163, 248.8, 56, 'Separated', 7.5);
    }

    $p1 .= $h(221.9, $R, 212.7).$v(326.6, 212.7, 268.4);
    foreach ([226.1, 240.2, 254.0] as $y) {
        $p1 .= $h(221.9, $R, $y, 'dash');
    }
    $p1 .= $t(226.4, 206.55, 'PRESENT ADDRESS', 8.6, 'b');
    foreach ([['House No./ Street Village', 'street', 219.4], ['Barangay', 'barangay', 233.15], ['Municipality/City', 'city', 247.1], ['Province', 'province', 261.2]] as [$label, $key, $yc]) {
        $p1 .= $t(226.4, $yc, $label, 7.9).$vall(326.6, $R, $yc, $f['address'][$key], 7.5, 2, 13);
    }

    // TIN / height
    $p1 .= $v(126.9, 268.4, 282.2).$v(404.4, 268.4, 323.2).$v(475.3, 268.4, 323.2);
    $p1 .= $t(41, 275.3, 'TIN', 8.6, 'b').$vall(126.9, 404.4, 275.3, $f['tin']);
    $p1 .= $t(408, 275.3, 'HEIGHT (FT.)', 9.1, 'b').$valc(475.3, $R, 275.3, $f['height']);

    // Disability (left) / contact and e-mail (right)
    $p1 .= $h(404.4, $R, 309.2);
    $p1 .= $t(41, 289.9, 'DISABILITY', 8.6, 'b');
    $disability = $f['disability']['types'];
    foreach ([['visual', 'Visual', 98.7, 295.0], ['speech', 'Speech', 158.6, 295.0], ['mental', 'Mental', 225.4, 295.0], ['hearing', 'Hearing', 98.7, 310.6], ['physical', 'Physical', 158.6, 310.6], ['others', 'Others', 225.4, 310.6]] as [$key, $label, $x, $yc]) {
        $p1 .= $cb($x, $yc, in_array($key, $disability, true), 7.8).$t($x + 18, $yc, $label, 9);
    }
    // "Please specify" blank: a short answer (an Others description like "Autism") sits on the
    // blank as the form intends. The blank is only ~40pt wide, so a longer one (always the case
    // once a physical description is included) goes in the empty part of this same cell just
    // above it, right of the checkbox columns, wrapped onto up to 3 lines — never past the divider.
    $specify = $f['disability']['specify'];
    if (mb_strlen($specify) <= 10) {
        $p1 .= $t(284.5, 311.4, 'Please specify:', 9).$blank(349.5, 391.4, 314.6, $specify, 6.5);
    } else {
        $p1 .= $t(284.5, 311.4, 'Please specify:', 9).$blank(349.5, 391.4, 314.6)
            .$val(284.5, 295.2, 116, $specify, 6.5, 'left', 3, 4.2, 19);
    }
    $p1 .= $t(408, 295.7, 'CONTACT<br>NUMBER/S', 8.6, 'b').$val(478.5, 295.7, 81, $f['contact'], 7.5, 'left', 2, 4.2, 26);
    $p1 .= $t(408, 316.2, 'E-MAIL', 8.6, 'b').$val(478.5, 316.2, 81, $f['email'], 7, 'left', 1, 3.2); // no spaces to wrap at

    // Employment status / type
    $p1 .= $section(329.9, 'EMPLOYMENT STATUS / TYPE');
    $p1 .= $v(271.1, 336.6, 467.2);
    $p1 .= $cb(43.6, 344.4, $emp['status'] === 'employed', 8.4).$t(58.5, 344.4, 'Employed', 9.6);
    $p1 .= $cb(62.6, 361.5, $emp['type'] === 'wage_employed', 7.4).$t(80.3, 361.5, 'Wage employed', 7.6);
    $p1 .= $cb(62.6, 372.6, $emp['type'] === 'self_employed', 7.4).$t(80.3, 372.6, 'Self-employed (Please specify)', 7.6);
    foreach ([['fisherman_fisherfolk', 'Fisherman/Fisherfolk', 384.4], ['vendor_retailer', 'Vendor/Retailer', 395.4], ['home_based_worker', 'Home-based worker', 406.6], ['transport', 'Transport', 417.9], ['domestic_worker', 'Domestic Worker', 428.8], ['freelancer', 'Freelancer', 440.1], ['artisan_craft_worker', 'Artisan/Craft Worker', 451.0], ['others', 'Others (Please specify):', 462.0]] as [$key, $label, $yc]) {
        $p1 .= $cb(79.9, $yc, $emp['self_employed_type'] === $key, 7.4).$t(96.5, $yc, $label, 7.6);
    }
    $p1 .= $blank(184.0, 249.0, 465.0, $emp['self_employed_other'], 6.5);

    $p1 .= $cb(277.0, 344.4, $emp['status'] === 'unemployed', 8.4).$t(305.7, 344.4, 'Unemployed', 9.6);
    $p1 .= $t(305.7, 355.8, 'How long have you been looking for work? (months)', 8).$blank(491.0, 526.5, 358.6, $emp['months_looking'], 7);
    foreach ([['fresh_graduate', 'New Entrant/Fresh Graduate', 377.2], ['finished_contract', 'Finished Contract', 398.4], ['resigned', 'Resigned', 419.3], ['retired', 'Retired', 440.5], ['terminated_calamity', 'Terminated/Laid off due to calamity', 461.6]] as [$key, $label, $yc]) {
        $p1 .= $cb(294.9, $yc, $emp['reason'] === $key, 7.8).$t(308.0, $yc, $label, 7.6);
    }
    foreach ([['terminated_local', 'Terminated/Laid off (local)', 376.5], ['terminated_abroad', 'Terminated/Laid off (abroad)', 398.0], ['others', 'Others, please specify:', 429.3]] as [$key, $label, $yc]) {
        $p1 .= $cb(432.3, $yc, $emp['reason'] === $key, 7.8).$t(446.4, $yc, $label, 7.6);
    }
    $p1 .= $t(449.2, 408.8, 'specify country:', 7.6).$blank(505.5, 553.5, 411.6, $emp['terminated_country'], 6.5);
    $p1 .= $blank(447.8, 525.8, 444.7, $emp['reason_other'], 6.5);

    // OFW / former OFW / 4Ps
    $ofw = $f['ofw'];
    $p1 .= $t(44.6, 475.2, 'Are you an OFW?', 9.7);
    $p1 .= $cb(129.6, 474.8, $ofw['is_ofw'] === true, 8.2).$t(142.2, 475.2, 'Yes', 9.2);
    $p1 .= $cb(169.9, 474.8, $ofw['is_ofw'] === false, 8.2).$t(183.0, 475.2, 'No', 9.2);
    $p1 .= $t(44.6, 489.0, 'Specify country', 9.7).$blank(114.5, 199.7, 492.6, $ofw['country']);
    $p1 .= $t(232.6, 474.6, 'Are you a former OFW?', 9.7);
    $p1 .= $cb(345.6, 474.2, $ofw['is_former'] === true, 8.2).$t(358.6, 474.6, 'Yes', 9.2);
    $p1 .= $cb(385.9, 474.2, $ofw['is_former'] === false, 8.2).$t(398.9, 474.6, 'No', 9.2);
    $p1 .= $t(232.6, 487.9, 'Latest country of deployment', 9.7).$blank(362.1, 435.9, 491.4, $ofw['former_country']);
    $p1 .= $t(232.6, 500.9, 'Month and year of return to Philippines', 9.7).$blank(406.2, 464.6, 504.4, $ofw['return_month_year']);

    $fourPs = $f['four_ps'];
    $p1 .= $t(44.6, 515.4, 'Are you a 4Ps beneficiary?', 9.7);
    $p1 .= $cb(164.0, 515.0, $fourPs['beneficiary'] === true, 8.2).$t(176.6, 515.4, 'Yes', 9.2);
    $p1 .= $cb(197.0, 515.0, $fourPs['beneficiary'] === false, 8.2).$t(210.0, 515.4, 'No', 9.2);
    $p1 .= $t(233.0, 515.0, 'If yes, please provide Household ID No.', 9.7).$blank(404.0, 516.0, 518.6, $fourPs['household_id']);

    // II. Job preference
    $pref = $f['preference'];
    $p1 .= $section(534.2, 'II. JOB PREFERENCE');
    $p1 .= $v(190.1, 543.3, 643.8).$v(346.8, 556.9, 643.8);
    foreach ([58.4, 210.7, 372.8] as $x) {
        $p1 .= $v($x, 578.3, 643.8);
    }
    $p1 .= $tc($L, 190.1, 550.1, 'PREFERRED OCCUPATION', 8.8).$tc(190.1, $R, 550.1, 'PREFERRED WORK LOCATION', 8.8);
    $p1 .= $cb(44.8, 567.6, $pref['work_type'] === 'part_time', 8.2).$t(62.4, 567.9, 'Part-time', 8.0);
    $p1 .= $cb(110.4, 567.6, $pref['work_type'] === 'full_time', 8.2).$t(131.6, 567.9, 'Full-time', 8.0);
    $p1 .= $cb(197.6, 566.8, $pref['location_kind'] === 'local', 8.2).$t(215.0, 567.1, 'Local (specify cities/municipalities):', 7.6);
    $p1 .= $cb(353.6, 566.8, $pref['location_kind'] === 'overseas', 8.2).$t(372.0, 567.1, 'Overseas, (specify countries):', 7.6);
    foreach ([589.05, 610.65, 632.65] as $i => $yc) {
        $no = ($i + 1).'.';
        $p1 .= $t(43, $yc - 4, $no, 8.8, 'b').$vall(58.4, 190.1, $yc, $pref['occupations'][$i], 7.5, 2, 20.5);
        $p1 .= $t(195.5, $yc - 4, $no, 8.8, 'b').$vall(210.7, 346.8, $yc, $pref['local'][$i], 7.5, 2, 20.5);
        $p1 .= $t(352, $yc - 4, $no, 8.8, 'b').$vall(372.8, $R, $yc, $pref['overseas'][$i], 7.5, 2, 20.5);
    }

    // III. Language / dialect proficiency
    $p1 .= $section(652.55, 'III. LANGUAGE / DIALECT PROFICIENCY <span style="font-weight:normal;font-size:10pt">&nbsp;(check if applicable)</span>');
    $cols = [[139.9, 270.9, 'read', 'READ'], [270.9, 373.1, 'write', 'WRITE'], [373.1, 469.8, 'speak', 'SPEAK'], [469.8, $R, 'understand', 'UNDERSTAND']];
    foreach ($cols as [$x1]) {
        $p1 .= $v($x1, 661.3, 755.3);
    }
    $p1 .= $t(44.6, 670.5, 'LANGUAGE/DIALECT', 8.8, 'b');
    foreach ($cols as [$x1, $x2, , $label]) {
        $p1 .= $tc($x1, $x2, 670.5, $label, 8.8);
    }
    foreach ([['english', 'English', 688.75], ['filipino', 'Filipino', 706.45], ['mandarin', 'Mandarin', 723.95], ['others', 'Others:', 742.6]] as [$key, $label, $yc]) {
        $p1 .= $t(44.6, $yc - 2, $label, 9.2);
        foreach ($cols as [$x1, $x2, $ability]) {
            $p1 .= $mark($x1, $x2, $yc, $f['languages'][$key][$ability]);
        }
    }
    $p1 .= $blank(78.3, 132.0, 746.6, $f['languages']['others']['name'], 6.5);
    $p1 .= $pageNo(1, 474.0, 781.2);

    // ═════════════════════════════════════════ PAGE 2 ═════════════════════════════════════════
    $p2 = '';
    $edu = $f['education'];

    $p2 .= $v($L, 39.9, 727.2).$v($R, 39.9, 727.2);
    foreach ([39.9, 53.1, 66.1, 98.3, 120.3, 159.2, 180.5, 206.8, 220.0, 258.8, 272.0, 285.6, 298.6, 311.8, 337.8, 350.9, 364.4, 377.4, 408.9, 422.3, 435.4, 448.8, 461.6, 551.0, 634.3, 727.2] as $y) {
        $p2 .= $h($L, $R, $y);
    }

    // IV. Educational background
    $p2 .= $section(46.5, 'IV. EDUCATIONAL BACKGROUND');
    $p2 .= $t(41, 59.6, 'Currently in school?', 8.8, 'b');
    $p2 .= $cb(133.6, 59.6, $f['currently_in_school'] === true, 8).$t(146.5, 59.6, 'Yes', 9.6);
    $p2 .= $cb(184.6, 59.6, $f['currently_in_school'] === false, 8).$t(198.2, 59.6, 'No', 9.6);
    $p2 .= $v(129.9, 66.1, 206.8).$v(333.2, 66.1, 206.8).$v(407.6, 66.1, 206.8).$v(471.2, 78.3, 206.8).$v(238.6, 120.3, 159.2);
    $p2 .= $h(407.6, $R, 78.3);
    $p2 .= $tc($L, 129.9, 82.2, 'LEVEL', 8.8).$tc(129.9, 333.2, 82.2, 'COURSE', 8.8).$tc(333.2, 407.6, 82.2, 'YEAR<br>GRADUATED', 8.8);
    $p2 .= $tc(407.6, $R, 72.2, 'IF UNDERGRADUATE', 7.6).$tc(407.6, 471.2, 88.3, 'LEVEL<br>REACHED', 7.4).$tc(471.2, $R, 88.3, 'YEAR LAST<br>ATTENDED', 7.4);
    $eduRow = static function (array $row, float $yc, float $height, bool $withCourse = true) use ($vall, $valc, $R): string {
        return ($withCourse ? $vall(129.9, 333.2, $yc, $row['course'], 7.5, 2, $height) : '')
            .$valc(333.2, 407.6, $yc, $row['year_graduated'])
            .$valc(407.6, 471.2, $yc, $row['level_reached'], 7.5, 2, $height)
            .$valc(471.2, $R, $yc, $row['year_last_attended']);
    };
    $p2 .= $t(41, 109.3, 'Elementary', 8.8, 'b').$eduRow($edu['elementary'], 109.3, 21);
    $p2 .= $cb(39.6, 126.0, $edu['secondary']['non_k12'], 8.2).$t(52.2, 126.3, 'Secondary', 8.8, 'b').$t(56.6, 139.3, '(Non-K12)', 8.8, 'b');
    $p2 .= $cb(134.2, 126.4, $edu['secondary']['k12'], 8.2).$t(146.8, 126.6, 'Secondary', 8.8, 'b').$t(146.8, 139.6, '(K-12)', 8.8, 'b');
    $p2 .= $t(243.4, 127.1, 'Senior High Strand:', 8.6, 'b').$val(243.4, 146.0, 87, $edu['secondary']['strand'], 7, 'left', 2, 4.2, 20);
    $p2 .= $eduRow($edu['secondary'], 139.75, 38, false);
    $p2 .= $t(41, 169.85, 'Tertiary', 8.8, 'b').$eduRow($edu['tertiary'], 169.85, 20.3);
    $p2 .= $t(41, 193.65, 'Graduate Studies/<br>Post-graduate', 8.8, 'b').$eduRow($edu['graduate'], 193.65, 25.3);

    // V. Technical/vocational and other training
    $p2 .= $section(213.4, 'V. TECHNICAL/VOCATIONAL AND OTHER TRAINING <span style="font-weight:normal;font-size:10pt">(Include courses taken as part of college education)</span>');
    $p2 .= $v(57.7, 258.8, 298.6);
    foreach ([210.9, 266.0, 377.2, 470.6] as $x) {
        $p2 .= $v($x, 220.0, 298.6);
    }
    $p2 .= $tc($L, 210.9, 239.4, 'TRAINING/VOCATIONAL COURSE', 8.8).$tc(210.9, 266.0, 239.4, 'HOURS<br>OF<br>TRAINING', 8.6);
    $p2 .= $tc(266.0, 377.2, 239.4, 'TRAINING<br>INSTITUTION', 8.8).$tc(377.2, 470.6, 239.4, 'SKILLS ACQUIRED', 8.8);
    $p2 .= $tc(470.6, $R, 235.6, 'CERTIFICATES<br>RECEIVED', 8.8).$tc(470.6, $R, 253.2, '(NC I, NC II, NC II, NC IV, etc.)', 5.2);
    foreach ([265.4, 278.8, 292.1] as $i => $yc) {
        $row = $f['trainings'][$i];
        $p2 .= $t(40.5, $yc, ($i + 1).($i < 2 ? '.' : ''), 8.8, 'b');
        if ($row) {
            $p2 .= $vall(57.7, 210.9, $yc, $row['course'], 7, 2, 13).$valc(210.9, 266.0, $yc, $row['hours'], 7)
                .$vall(266.0, 377.2, $yc, $row['institution'], 7, 2, 13).$vall(377.2, 470.6, $yc, $row['skills'], 7, 2, 13)
                .$vall(470.6, $R, $yc, $row['certificates'], 7, 2, 13);
        }
    }

    // VI. Eligibility / professional license
    $p2 .= $section(305.2, 'VI. ELIGIBILITY/ PROFESSIONAL LICENSE');
    $p2 .= $v(58.2, 337.8, 364.4).$v(266.9, 337.8, 364.4);
    foreach ([182.4, 237.0, 470.1] as $x) {
        $p2 .= $v($x, 311.8, 364.4);
    }
    $p2 .= $tc($L, 182.4, 324.8, 'ELIGIBILITY<br>(Civil Service)', 8.8).$tc(182.4, 237.0, 324.8, 'DATE<br>TAKEN', 8.8);
    $p2 .= $tc(237.0, 470.1, 324.8, 'PROFESSIONAL LICENSE (PRC)', 8.8).$tc(470.1, $R, 324.8, 'VALID UNTIL', 8.8);
    foreach ([344.35, 357.65] as $i => $yc) {
        $civil = $f['eligibilities'][$i];
        $license = $f['licenses'][$i];
        $p2 .= $t(40.5, $yc, ($i + 1).'.', 8.8, 'b').$t(240.5, $yc, ($i + 1).'.', 8.8, 'b');
        if ($civil) {
            $p2 .= $vall(58.2, 182.4, $yc, $civil['name'], 7, 2, 13).$valc(182.4, 237.0, $yc, $civil['date_taken'], 7);
        }
        if ($license) {
            $p2 .= $vall(266.9, 470.1, $yc, $license['name'], 7, 2, 13).$valc(470.1, $R, $yc, $license['valid_until'], 7);
        }
    }

    // VII. Work experience (most recent first)
    $p2 .= $section(370.9, 'VII. WORK EXPERIENCE <span style="font-weight:normal;font-size:10pt">(Limit to 10 year period, start with the most recent employment)</span>');
    foreach ([141.1, 244.0, 345.6, 447.3] as $x) {
        $p2 .= $v($x, 377.4, 448.8);
    }
    $p2 .= $tc($L, 141.1, 393.15, 'COMPANY NAME', 8.8);
    $p2 .= $tc(141.1, 244.0, 388.6, 'ADDRESS', 8.8).$tc(141.1, 244.0, 399.4, '(City/Municipality)', 7, '');
    $p2 .= $tc(244.0, 345.6, 393.15, 'POSITION', 8.8).$tc(345.6, 447.3, 393.15, 'NUMBER<br>OF MONTHS', 8.8);
    $p2 .= $tc(447.3, $R, 385.4, 'STATUS', 8.8).$tc(447.3, $R, 400.4, '(Permanent, Contractual, Part-<br>time, Probationary)', 6.9, '');
    foreach ([415.6, 428.85, 442.1] as $i => $yc) {
        if ($row = $f['work'][$i]) {
            $p2 .= $vall($L, 141.1, $yc, $row['company'], 7, 2, 13).$vall(141.1, 244.0, $yc, $row['address'], 7, 2, 13)
                .$vall(244.0, 345.6, $yc, $row['position'], 7, 2, 13).$valc(345.6, 447.3, $yc, $row['months'], 7)
                .$valc(447.3, $R, $yc, $row['status'], 7);
        }
    }

    // VIII. Other skills acquired without certificate
    $p2 .= $section(455.2, 'VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE');
    $skillRows = [467.6, 480.6, 493.6, 508.3, 523.0, 535.6];
    foreach (\App\Support\Nsrp\NsrpFormData::STANDARD_SKILLS as $c => $column) {
        [$bx, $lx] = [[42.6, 63.5], [247.6, 276.6], [418.4, 437.2]][$c];
        foreach ($column as $r => $label) {
            $p2 .= $cb($bx, $skillRows[$r] - 0.6, isset($f['skills']['checked'][$label]), 8.4).$t($lx, $skillRows[$r], strtoupper($label), 8.8);
        }
    }
    $p2 .= $cb(418.4, $skillRows[5] - 0.6, $f['skills']['others'] !== '', 8.4).$t(437.2, $skillRows[5], 'OTHERS:', 8.8);
    $p2 .= $h(475.1, 552.5, 540.4).$val(479.5, 540.4 - 4, 72, $f['skills']['others'], 6.5);

    // Certification / authorization (no rule under the title on the official form)
    $p2 .= $tc($L, $R, 557.0, 'CERTIFICATION/AUTHORIZATION', 9.2);
    $p2 .= '<div class="para" style="left:40.5pt;top:563.4pt;width:517.5pt;font-size:8.75pt;line-height:11.85pt;">This is to certify that all data/information that I have provided in this form are true to the best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.</div>';
    $p2 .= $h(56.6, 203.3, 620.8).$tc(56.6, 203.3, 628.4, 'Signature of Applicant', 8.8, '');
    $p2 .= $h(373.2, 486.1, 620.8).$tc(373.2, 486.1, 628.4, 'Date', 8.8, '');

    // For use of PESO only
    $p2 .= $tc($L, $R, 640.95, 'FOR USE OF PESO ONLY. PLEASE DO NOT WRITE BELOW THIS DOTTED LINE.', 9.2);
    $p2 .= $h($L, $R, 647.6, 'dot');
    $p2 .= $t(43.4, 654.4, 'Referred to:', 9, 'b');
    foreach ([['SPES', 667.0], ['GIP', 680.1], ['TUPAD', 692.7], ['JobStart', 705.3], ['Others, specify:', 718.0]] as [$label, $yc]) {
        $p2 .= $cb(43.3, $yc, false, 11.4).$t(60.7, $yc, $label, 8.8, 'b');
    }
    $p2 .= $cb(108.6, 667.4, false, 11.4).$t(125.5, 667.4, 'DILEEP', 8.8, 'b');
    $p2 .= $cb(108.6, 680.5, false, 11.4).$t(125.5, 680.5, 'TESDA Training', 8.8, 'b');
    $p2 .= $h(126.7, 205.3, 722.4);
    $p2 .= $t(274.6, 654.4, 'Assessed by:', 9, 'b');
    $p2 .= $h(274.6, 446.6, 697.4).$tc(274.6, 446.6, 705.3, 'Signature over Printed Name of Assessor', 8.8);
    $p2 .= $h(473.0, 529.3, 697.4).$tc(473.0, 529.3, 705.3, 'Date', 8.8);
    $p2 .= $pageNo(2, 469.0, 757.9);
@endphp
<div class="page">{!! $p1 !!}</div>
<div class="page last">{!! $p2 !!}</div>
</body>
</html>
