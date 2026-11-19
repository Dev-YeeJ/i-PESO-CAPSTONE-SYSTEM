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

    $L = 36.0;   // frame left
    $R = 559.0;  // frame right
    $section = static fn (float $yc, string $html) => $t($L + 4, $yc, $html, 8.5, 'b');
    $pageNo = static fn (int $page) => $t(470, 772, 'Page <span class="b">'.$page.'</span> of <span class="b">2</span>', 9, 'b');

    $f = $form;
    $emp = $f['employment'];

    // ═════════════════════════════════════════ PAGE 1 ═════════════════════════════════════════
    $p1 = '';

    // Frame and rules
    $p1 .= $v($L, 36, 745.2).$v($R, 36, 745.2);
    foreach ([36, 87.5, 127.2, 140.6, 182.4, 196.2, 262, 275.7, 317.6, 329.7, 459.8, 500.4, 517.2, 535.1, 549.4, 570.3, 591.6, 613.4, 635, 652.2, 670.6, 688.6, 706.2, 724.2, 745.2] as $y) {
        $p1 .= $h($L, $R, $y);
    }

    // Header
    $p1 .= $v(116.3, 36, 87.5);
    $p1 .= $tc($L, 116.3, 61.8, 'NSRP Form 1<br>September<br>2020', 8.5);
    $p1 .= $tc(116.3, $R, 43.5, 'Republic of the Philippines', 8.8, '');
    $p1 .= $tc(116.3, $R, 55.5, 'Department of Labor and Employment', 8.8, '');
    $p1 .= $tc(116.3, $R, 68.3, 'NATIONAL SKILLS REGISTRATION PROGRAM', 9.6);
    $p1 .= $tc(116.3, $R, 80.6, 'JOBSEEKER REGISTRATION FORM', 9.6);
    $p1 .= '<div class="para" style="left:40pt;top:89pt;width:515pt;font-size:7.7pt;"><span class="b">INSTRUCTIONS:</span> Please fill out the form legibly in block letters using a ballpoint pen. Check appropriate boxes. Please do not leave any items unanswered. Indicate &ldquo;NA&rdquo; if not applicable. You may use extra sheet if needed. Submit accomplished form to the Public Employment Service Office (PESO) Manager or Officer in your city/municipality.</div>';

    // I. Personal information — name
    $p1 .= $section(133.9, 'I.PERSONAL INFORMATION');
    $p1 .= $h($L, $R, 167.8, 'dash');
    foreach ([['surname', 36, 142], ['first', 142, 273], ['middle', 273, 414], ['suffix', 414, 559]] as [$key, $x1, $x2]) {
        $p1 .= $valc($x1, $x2, 155.2, $f['name'][$key], 9.5, 2, 21);
    }
    $p1 .= $tc(36, 142, 175.4, 'SURNAME', 8.2).$tc(142, 273, 175.4, 'FIRST NAME', 8.2).$tc(273, 414, 175.4, 'MIDDLE NAME', 8.2).$tc(414, 559, 175.4, 'SUFFIX (Ex: Sr., Jr., III, etc.)', 8.2);

    // Date of birth
    $p1 .= $t(40, 189.3, '<span class="b">DATE OF BIRTH</span> <span style="font-size:7pt">(mm/dd/yyyy)</span>', 8.2);
    $p1 .= $val(160, 189.3, 200, $f['date_of_birth'], 8);

    // Sex / religion / civil status (left) and present address (right)
    $p1 .= $v(221, 196.2, 262);
    $p1 .= $h($L, 221, 209.6).$h($L, 221, 222.2);
    $p1 .= $t(40, 202.9, 'SEX', 8.2, 'b');
    $p1 .= $cb(66, 202.9, $f['sex'] === 'male').$t(76.5, 202.9, 'Male', 8.2);
    $p1 .= $cb(111.3, 202.9, $f['sex'] === 'female').$t(121.8, 202.9, 'Female', 8.2);
    $p1 .= $t(40, 215.9, 'RELIGION', 8.2, 'b').$val(86, 215.9, 132, $f['religion'], 7.5);
    $p1 .= $t(40, 229.3, 'CIVIL', 8.2, 'b').$t(40, 243.1, 'STATUS', 8.2, 'b');
    foreach ([['single', 'Single', 229.3], ['married', 'Married', 243.1], ['widowed', 'Widowed', 256.5]] as [$key, $label, $yc]) {
        $p1 .= $cb(108.8, $yc, $f['civil_status'] === $key).$t(119.5, $yc, $label, 8.2);
    }
    if ($f['civil_status'] === 'separated') {
        // Not one of the form's three boxes: written in, as an applicant would.
        $p1 .= $val(160, 243.1, 58, 'Separated', 7.5);
    }

    $p1 .= $h(221, $R, 209.6).$v(324.7, 209.6, 262);
    foreach ([222.2, 236.0, 249.4] as $y) {
        $p1 .= $h(221, $R, $y, 'dash');
    }
    $p1 .= $t(225, 202.9, 'PRESENT ADDRESS', 8.2, 'b');
    foreach ([['House No./ Street Village', 'street', 215.9], ['Barangay', 'barangay', 229.1], ['Municipality/City', 'city', 242.7], ['Province', 'province', 255.7]] as [$label, $key, $yc]) {
        $p1 .= $t(225, $yc, $label, 7).$vall(324.7, $R, $yc, $f['address'][$key], 7.5, 2, 12.6);
    }

    // TIN / height
    $p1 .= $v(126.8, 262, 275.7).$v(401.7, 262, 317.6).$v(472, 262, 317.6);
    $p1 .= $t(40, 268.9, 'TIN', 8.2, 'b').$vall(126.8, 401.7, 268.9, $f['tin']);
    $p1 .= $t(405, 268.9, 'HEIGHT (FT.)', 8.2, 'b').$valc(472, $R, 268.9, $f['height']);

    // Disability (left) / contact and e-mail (right)
    $p1 .= $h(401.7, $R, 302.9);
    $p1 .= $t(40, 282.5, 'DISABILITY', 8.2, 'b');
    $disability = $f['disability']['types'];
    foreach ([['visual', 'Visual', 101.7, 289.1], ['speech', 'Speech', 162.4, 289.1], ['mental', 'Mental', 228.5, 289.1], ['hearing', 'Hearing', 101.7, 304.6], ['physical', 'Physical', 162.4, 304.6], ['others', 'Others', 228.5, 304.6]] as [$key, $label, $x, $yc]) {
        $p1 .= $cb($x, $yc, in_array($key, $disability, true), 7.6).$t($x + 11, $yc, $label, 8.2);
    }
    $p1 .= $t(280.3, 304.6, 'Please specify:', 8).$blank(339, 398, 308.6, $f['disability']['other'], 6.5);
    $p1 .= $t(405, 284.3, 'CONTACT<br>NUMBER/S', 8.2, 'b').$val(474.5, 289.3, 82, $f['contact'], 7.5, 'left', 2, 4.2, 26);
    $p1 .= $t(405, 310.2, 'E-MAIL', 8.2, 'b').$val(474.5, 310.2, 82, $f['email'], 7, 'left', 1, 3.2); // no spaces to wrap at

    // Employment status / type
    $p1 .= $section(323.6, 'EMPLOYMENT STATUS / TYPE');
    $p1 .= $v(270.3, 329.7, 459.8);
    $p1 .= $cb(42.3, 338.4, $emp['status'] === 'employed', 8.4).$t(55, 338.4, 'Employed', 9);
    $p1 .= $cb(61.9, 354.8, $emp['type'] === 'wage_employed', 7.4).$t(76, 354.8, 'Wage employed', 7.2);
    $p1 .= $cb(61.9, 366.1, $emp['type'] === 'self_employed', 7.4).$t(76, 366.1, 'Self-employed (Please specify)', 7.2);
    foreach ([['fisherman_fisherfolk', 'Fisherman/Fisherfolk', 377.6], ['vendor_retailer', 'Vendor/Retailer', 388.7], ['home_based_worker', 'Home-based worker', 399.8], ['transport', 'Transport', 410.9], ['domestic_worker', 'Domestic Worker', 422.0], ['freelancer', 'Freelancer', 433.1], ['artisan_craft_worker', 'Artisan/Craft Worker', 444.2], ['others', 'Others (Please specify):', 455.0]] as [$key, $label, $yc]) {
        $p1 .= $cb(78.7, $yc, $emp['self_employed_type'] === $key, 7.4).$t(92.5, $yc, $label, 7.2);
    }
    $p1 .= $blank(181, 252, 457.8, $emp['self_employed_other'], 6.5);

    $p1 .= $cb(275.3, 338.4, $emp['status'] === 'unemployed', 8.4).$t(303, 338.4, 'Unemployed', 9);
    $p1 .= $t(303, 349.6, 'How long have you been looking for work? (months)', 7.2).$blank(487.5, 523, 352.6, $emp['months_looking'], 7);
    foreach ([['fresh_graduate', 'New Entrant/Fresh Graduate', 370.7], ['finished_contract', 'Finished Contract', 391.6], ['resigned', 'Resigned', 412.6], ['retired', 'Retired', 433.5], ['terminated_calamity', 'Terminated/Laid off due to calamity', 454.4]] as [$key, $label, $yc]) {
        $p1 .= $cb(294.6, $yc, $emp['reason'] === $key, 7.6).$t(306.5, $yc, $label, 7.2);
    }
    foreach ([['terminated_local', 'Terminated/Laid off (local)', 370.0], ['terminated_abroad', 'Terminated/Laid off (abroad)', 390.8], ['others', 'Others, please specify:', 422.2]] as [$key, $label, $yc]) {
        $p1 .= $cb(431.4, $yc, $emp['reason'] === $key, 7.6).$t(443.5, $yc, $label, 7.2);
    }
    $p1 .= $t(446, 402.1, 'specify country:', 7.2).$blank(500.4, 552, 405.3, $emp['terminated_country'], 6.5);
    $p1 .= $blank(443.5, 526, 438.2, $emp['reason_other'], 6.5);

    // OFW / former OFW / 4Ps
    $ofw = $f['ofw'];
    $p1 .= $t(41, 468.0, 'Are you an OFW?', 8.6);
    $p1 .= $cb(131.8, 468.0, $ofw['is_ofw'] === true, 7.8).$t(142.5, 468.0, 'Yes', 8.6);
    $p1 .= $cb(172.0, 468.0, $ofw['is_ofw'] === false, 7.8).$t(182.7, 468.0, 'No', 8.6);
    $p1 .= $t(41, 481.8, 'Specify country', 8.6).$blank(113.4, 198, 485.4, $ofw['country']);
    $p1 .= $t(231.4, 468.0, 'Are you a former OFW?', 8.6);
    $p1 .= $cb(347.3, 468.0, $ofw['is_former'] === true, 7.8).$t(358, 468.0, 'Yes', 8.6);
    $p1 .= $cb(387.4, 468.0, $ofw['is_former'] === false, 7.8).$t(398.1, 468.0, 'No', 8.6);
    $p1 .= $t(231.4, 480.6, 'Latest country of deployment', 8.6).$blank(359.8, 433.1, 484.2, $ofw['former_country']);
    $p1 .= $t(231.4, 493.3, 'Month and year of return to Philippines', 8.6).$blank(402.9, 461.5, 496.9, $ofw['return_month_year']);

    $fourPs = $f['four_ps'];
    $p1 .= $t(41, 508.8, 'Are you a 4Ps beneficiary?', 8.6);
    $p1 .= $cb(161.5, 508.8, $fourPs['beneficiary'] === true, 7.8).$t(172.2, 508.8, 'Yes', 8.6);
    $p1 .= $cb(196.2, 508.8, $fourPs['beneficiary'] === false, 7.8).$t(206.9, 508.8, 'No', 8.6);
    $p1 .= $t(230.6, 508.8, 'If yes, please provide Household ID No.', 8.6).$blank(398, 512, 512.4, $fourPs['household_id']);

    // II. Job preference
    $pref = $f['preference'];
    $p1 .= $section(526.1, 'II. JOB PREFERENCE');
    $p1 .= $v(190.4, 535.1, 635).$v(346.4, 549.4, 635);
    foreach ([59.8, 211.3, 372.4] as $x) {
        $p1 .= $v($x, 570.3, 635);
    }
    $p1 .= $tc($L, 190.4, 542.2, 'PREFERRED OCCUPATION', 8.4).$tc(190.4, $R, 542.2, 'PREFERRED WORK LOCATION', 8.4);
    $p1 .= $cb(48.1, 559.9, $pref['work_type'] === 'part_time', 7.8).$t(61.5, 559.9, 'Part-time', 7.6);
    $p1 .= $cb(113.0, 559.9, $pref['work_type'] === 'full_time', 7.8).$t(130.5, 559.9, 'Full-time', 7.6);
    $p1 .= $cb(200.0, 559.9, $pref['location_kind'] === 'local', 7.8).$t(214, 559.9, 'Local (specify cities/municipalities):', 6.9);
    $p1 .= $cb(355.2, 559.9, $pref['location_kind'] === 'overseas', 7.8).$t(370.5, 559.9, 'Overseas, (specify countries):', 6.9);
    foreach ([581.0, 602.5, 624.2] as $i => $yc) {
        $no = ($i + 1).'.';
        $p1 .= $t(40, $yc, $no, 8.4, 'b').$vall(59.8, 190.4, $yc, $pref['occupations'][$i], 7.5, 2, 20.5);
        $p1 .= $t(195, $yc, $no, 8.4, 'b').$vall(211.3, 346.4, $yc, $pref['local'][$i], 7.5, 2, 20.5);
        $p1 .= $t(351, $yc, $no, 8.4, 'b').$vall(372.4, $R, $yc, $pref['overseas'][$i], 7.5, 2, 20.5);
    }

    // III. Language / dialect proficiency
    $p1 .= $section(643.6, 'III. LANGUAGE / DIALECT PROFICIENCY <span style="font-weight:normal">&nbsp;(check if applicable)</span>');
    $cols = [[141.4, 271.1, 'read', 'READ'], [271.1, 372.8, 'write', 'WRITE'], [372.8, 469.0, 'speak', 'SPEAK'], [469.0, $R, 'understand', 'UNDERSTAND']];
    foreach ($cols as [$x1]) {
        $p1 .= $v($x1, 652.2, 745.2);
    }
    $p1 .= $t(40, 661.4, 'LANGUAGE/DIALECT', 8.4, 'b');
    foreach ($cols as [$x1, $x2, , $label]) {
        $p1 .= $tc($x1, $x2, 661.4, $label, 8.4);
    }
    foreach ([['english', 'English', 679.6], ['filipino', 'Filipino', 697.4], ['mandarin', 'Mandarin', 715.2], ['others', 'Others:', 734.7]] as [$key, $label, $yc]) {
        $p1 .= $t(40, $yc, $label, 8.4);
        foreach ($cols as [$x1, $x2, $ability]) {
            $p1 .= $mark($x1, $x2, $yc, $f['languages'][$key][$ability]);
        }
    }
    $p1 .= $blank(70, 138.5, 738.4, $f['languages']['others']['name'], 6.5);
    $p1 .= $pageNo(1);

    // ═════════════════════════════════════════ PAGE 2 ═════════════════════════════════════════
    $p2 = '';
    $edu = $f['education'];

    $p2 .= $v($L, 36, 745).$v($R, 36, 745);
    foreach ([36, 49.5, 62.9, 96.6, 118.9, 158.9, 179.9, 208.5, 222.0, 262.0, 275.9, 290.2, 304.0, 317.5, 344.0, 357.5, 371.4, 384.8, 417.7, 431.1, 445.0, 458.9, 472.4, 563.7, 576.7, 649.1, 745] as $y) {
        $p2 .= $h($L, $R, $y);
    }

    // IV. Educational background
    $p2 .= $section(42.7, 'IV. EDUCATIONAL BACKGROUND');
    $p2 .= $t(40, 56.2, 'Currently in school?', 8.4);
    $p2 .= $cb(136.3, 56.2, $f['currently_in_school'] === true, 7.8).$t(147.5, 56.2, 'Yes', 8.4);
    $p2 .= $cb(187.1, 56.2, $f['currently_in_school'] === false, 7.8).$t(198.3, 56.2, 'No', 8.4);
    $p2 .= $v(128.6, 62.9, 208.5).$v(331.6, 62.9, 208.5).$v(405.6, 62.9, 208.5).$v(468.5, 76.8, 208.5).$v(237.0, 118.9, 158.9);
    $p2 .= $h(405.6, $R, 76.8);
    $p2 .= $tc($L, 128.6, 79.7, 'LEVEL', 8.6).$tc(128.6, 331.6, 79.7, 'COURSE', 8.6).$tc(331.6, 405.6, 79.7, 'YEAR<br>GRADUATED', 8.6);
    $p2 .= $tc(405.6, $R, 69.8, 'IF UNDERGRADUATE', 7.6).$tc(405.6, 468.5, 86.7, 'LEVEL<br>REACHED', 7).$tc(468.5, $R, 86.7, 'YEAR LAST<br>ATTENDED', 7);
    $eduRow = static function (array $row, float $yc, float $height, bool $withCourse = true) use ($vall, $valc): string {
        return ($withCourse ? $vall(128.6, 331.6, $yc, $row['course'], 7.5, 2, $height) : '')
            .$valc(331.6, 405.6, $yc, $row['year_graduated'])
            .$valc(405.6, 468.5, $yc, $row['level_reached'], 7.5, 2, $height)
            .$valc(468.5, 559, $yc, $row['year_last_attended']);
    };
    $p2 .= $t(40, 107.7, 'Elementary', 8.4).$eduRow($edu['elementary'], 107.7, 22.3);
    $p2 .= $cb(45.3, 125.6, $edu['secondary']['non_k12'], 7.8).$t(56.5, 125.6, 'Secondary', 8.4).$t(63, 139, '(Non-K12)', 8.4);
    $p2 .= $cb(136.7, 125.6, $edu['secondary']['k12'], 7.8).$t(148, 125.6, 'Secondary', 8.4).$t(154.5, 139, '(K-12)', 8.4);
    $p2 .= $t(241, 125.6, 'Senior High Strand:', 8.1).$val(241, 145.5, 88, $edu['secondary']['strand'], 7, 'left', 2, 4.2, 24);
    $p2 .= $eduRow($edu['secondary'], 138.9, 40, false);
    $p2 .= $t(40, 169.4, 'Tertiary', 8.4).$eduRow($edu['tertiary'], 169.4, 21);
    $p2 .= $t(40, 194.2, 'Graduate Studies/<br>Post-graduate', 8.4).$eduRow($edu['graduate'], 194.2, 28.6);

    // V. Technical/vocational and other training
    $p2 .= $section(215.25, 'V. TECHNICAL/VOCATIONAL AND OTHER TRAINING <span style="font-weight:normal">(Include courses taken as part of college education)</span>');
    $p2 .= $v(56.3, 262.0, 304.0);
    foreach ([209.4, 264.6, 375.1, 467.7] as $x) {
        $p2 .= $v($x, 222.0, 304.0);
    }
    $p2 .= $tc($L, 209.4, 242, 'TRAINING/VOCATIONAL COURSE', 8.4).$tc(209.4, 264.6, 242, 'HOURS<br>OF<br>TRAINING', 8.2);
    $p2 .= $tc(264.6, 375.1, 242, 'TRAINING<br>INSTITUTION', 8.4).$tc(375.1, 467.7, 242, 'SKILLS ACQUIRED', 8.4);
    $p2 .= $tc(467.7, $R, 237, 'CERTIFICATES<br>RECEIVED', 8.4).$tc(467.7, $R, 255.2, '(NC I, NC II, NC III, NC IV, etc.)', 4.9);
    foreach ([268.95, 283.05, 297.1] as $i => $yc) {
        $row = $f['trainings'][$i];
        $p2 .= $t(39.5, $yc, ($i + 1).($i < 2 ? '.' : ''), 8.4, 'b');
        if ($row) {
            $p2 .= $vall(56.3, 209.4, $yc, $row['course'], 7, 2, 13.5).$valc(209.4, 264.6, $yc, $row['hours'], 7)
                .$vall(264.6, 375.1, $yc, $row['institution'], 7, 2, 13.5).$vall(375.1, 467.7, $yc, $row['skills'], 7, 2, 13.5)
                .$vall(467.7, $R, $yc, $row['certificates'], 7, 2, 13.5);
        }
    }

    // VI. Eligibility / professional license
    $p2 .= $section(310.75, 'VI. ELIGIBILITY/ PROFESSIONAL LICENSE');
    $p2 .= $v(56.3, 344.0, 371.4).$v(264.6, 344.0, 371.4);
    foreach ([181.0, 235.8, 467.7] as $x) {
        $p2 .= $v($x, 317.5, 371.4);
    }
    $p2 .= $tc($L, 181.0, 330.75, 'ELIGIBILITY<br>(Civil Service)', 8.4).$tc(181.0, 235.8, 330.75, 'DATE<br>TAKEN', 8.4);
    $p2 .= $tc(235.8, 467.7, 330.75, 'PROFESSIONAL LICENSE (PRC)', 8.4).$tc(467.7, $R, 330.75, 'VALID UNTIL', 8.4);
    foreach ([350.75, 364.45] as $i => $yc) {
        $civil = $f['eligibilities'][$i];
        $license = $f['licenses'][$i];
        $p2 .= $t(39.5, $yc, ($i + 1).'.', 8.4, 'b').$t(239.5, $yc, ($i + 1).'.', 8.4, 'b');
        if ($civil) {
            $p2 .= $vall(56.3, 181.0, $yc, $civil['name'], 7, 2, 13.5).$valc(181.0, 235.8, $yc, $civil['date_taken'], 7);
        }
        if ($license) {
            $p2 .= $vall(264.6, 467.7, $yc, $license['name'], 7, 2, 13.5).$valc(467.7, $R, $yc, $license['valid_until'], 7);
        }
    }

    // VII. Work experience (most recent first)
    $p2 .= $section(378.1, 'VII. WORK EXPERIENCE <span style="font-weight:normal">(Limit to 10 year period, start with the most recent employment)</span>');
    foreach ([140.0, 242.3, 343.8, 444.9] as $x) {
        $p2 .= $v($x, 384.8, 458.9);
    }
    $p2 .= $tc($L, 140.0, 401.25, 'COMPANY NAME', 8.4);
    $p2 .= $tc(140.0, 242.3, 396.6, 'ADDRESS', 8.4).$tc(140.0, 242.3, 408.6, '(City/Municipality)', 5.6, '');
    $p2 .= $tc(242.3, 343.8, 401.25, 'POSITION', 8.4).$tc(343.8, 444.9, 401.25, 'NUMBER<br>OF MONTHS', 8.4);
    $p2 .= $tc(444.9, $R, 393.6, 'STATUS', 8.4).$tc(444.9, $R, 408.6, '(Permanent, Contractual, Part-<br>time, Probationary)', 5.6, '');
    foreach ([424.4, 438.05, 451.95] as $i => $yc) {
        if ($row = $f['work'][$i]) {
            $p2 .= $vall($L, 140.0, $yc, $row['company'], 7, 2, 13.5).$vall(140.0, 242.3, $yc, $row['address'], 7, 2, 13.5)
                .$vall(242.3, 343.8, $yc, $row['position'], 7, 2, 13.5).$valc(343.8, 444.9, $yc, $row['months'], 7)
                .$valc(444.9, $R, $yc, $row['status'], 7);
        }
    }

    // VIII. Other skills acquired without certificate
    $p2 .= $section(465.65, 'VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE');
    $skillRows = [479.2, 492.8, 506.4, 520.0, 533.6, 547.2];
    foreach (\App\Support\Nsrp\NsrpFormData::STANDARD_SKILLS as $c => $column) {
        [$bx, $lx] = [[45.3, 62.4], [248.0, 274.8], [417.7, 434.8]][$c];
        foreach ($column as $r => $label) {
            $p2 .= $cb($bx, $skillRows[$r], isset($f['skills']['checked'][$label]), 8).$t($lx, $skillRows[$r], strtoupper($label), 8.4);
        }
    }
    $p2 .= $cb(417.7, $skillRows[5], $f['skills']['others'] !== '', 8).$t(434.8, $skillRows[5], 'OTHERS:', 8.4);
    $p2 .= $blank(472, 553, 550.6, $f['skills']['others'], 6.5);

    // Certification / authorization
    $p2 .= $tc($L, $R, 570.2, 'CERTIFICATION/AUTHORIZATION', 8.8);
    $p2 .= '<div class="para" style="left:40pt;top:579.5pt;width:515pt;font-size:7.9pt;">This is to certify that all data/information that I have provided in this form are true to the best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.</div>';
    $p2 .= $h(72.5, 218.7, 632.5).$tc(72.5, 218.7, 640.6, 'Signature of Applicant', 8.4, '');
    $p2 .= $h(371.0, 483.5, 632.5).$tc(371.0, 483.5, 640.6, 'Date', 8.4, '');

    // For use of PESO only
    $p2 .= $tc($L, $R, 656.1, 'FOR USE OF PESO ONLY. PLEASE DO NOT WRITE BELOW THIS DOTTED LINE.', 8.8);
    $p2 .= $h($L, $R, 663.0, 'dot');
    $p2 .= $t(43.4, 670.8, 'Referred to:', 8.6, 'b');
    foreach ([['SPES', 683.6], ['GIP', 697.1], ['TUPAD', 710.1], ['JobStart', 723.2], ['Others, specify:', 736.2]] as [$label, $yc]) {
        $p2 .= $cb(45.5, $yc, false, 10).$t(59.6, $yc, $label, 8.4, 'b');
    }
    $p2 .= $cb(110.5, 683.6, false, 10).$t(124.1, 683.6, 'DILEEP', 8.4, 'b');
    $p2 .= $cb(110.5, 697.1, false, 10).$t(124.1, 697.1, 'TESDA Training', 8.4, 'b');
    $p2 .= $h(125.3, 203.7, 739.6);
    $p2 .= $t(272.8, 670.8, 'Assessed by:', 8.6, 'b');
    $p2 .= $h(272.8, 444.1, 714.3).$tc(272.8, 444.1, 723.2, 'Signature over Printed Name of Assessor', 8.4);
    $p2 .= $h(470.5, 526.6, 714.3).$tc(470.5, 526.6, 723.2, 'Date', 8.4);
    $p2 .= $pageNo(2);
@endphp
<div class="page">{!! $p1 !!}</div>
<div class="page last">{!! $p2 !!}</div>
</body>
</html>
