export type DomainErrorKind =
  'validation' | 'not_found' | 'forbidden' | 'unauthorized' | 'conflict';

export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly kind: DomainErrorKind,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Geçersiz veri.') {
    super(message, 'validation');
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Kayıt bulunamadı.') {
    super(message, 'not_found');
  }
}

export class AccessDeniedError extends DomainError {
  constructor(message = 'Bu işlem için yetkiniz bulunmamaktadır.') {
    super(message, 'forbidden');
  }
}

export class AuthenticationError extends DomainError {
  constructor(message = 'Kimlik doğrulaması gereklidir.') {
    super(message, 'unauthorized');
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Kayıt zaten mevcut.') {
    super(message, 'conflict');
  }
}

export class InvalidIdentifierError extends ValidationError {
  constructor(message = 'Geçersiz kimlik (ID) formatı.') {
    super(message);
  }
}
