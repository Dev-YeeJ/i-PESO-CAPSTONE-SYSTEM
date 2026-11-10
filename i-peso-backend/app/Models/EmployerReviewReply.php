<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** The employer's one public reply to a review. */
class EmployerReviewReply extends Model
{
    protected $fillable = ['review_id', 'employer_id', 'body', 'status', 'edited_at'];

    protected $casts = ['edited_at' => 'datetime'];

    public function review(): BelongsTo
    {
        return $this->belongsTo(EmployerReview::class, 'review_id');
    }
}
