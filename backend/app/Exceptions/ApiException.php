<?php

namespace App\Exceptions;

use Exception;
use InvalidArgumentException;

class ApiException extends Exception
{
    private const STATUS_CODES = [
        'UNAUTHENTICATED' => 401,
        'FORBIDDEN_ROLE' => 403,
        'NOT_GOING' => 403,
        'NOT_FOUND' => 404,
        'INVALID_CODE' => 404,
        'OWN_CODE' => 422,
        'ALREADY_EXCHANGED' => 409,
        'CODE_WINDOW_CLOSED' => 422,
        'EVENT_ENDED' => 422,
        'CANNOT_CANCEL' => 409,
        'OUTSIDE_GRID' => 422,
        'VALIDATION_FAILED' => 422,
    ];

    public readonly int $statusCode;

    public function __construct(public readonly string $errorCode, string $message)
    {
        if (! isset(self::STATUS_CODES[$errorCode])) {
            throw new InvalidArgumentException('The API error code is not in the contract.');
        }

        $this->statusCode = self::STATUS_CODES[$errorCode];
        parent::__construct($message);
    }
}
