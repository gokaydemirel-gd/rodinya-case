import {
  AccessDeniedError,
  ConflictError,
  NotFoundError,
} from './domain.errors';

export class UserNotFoundError extends NotFoundError {
  constructor(message = 'Kullanıcı bulunamadı.') {
    super(message);
  }
}

export class UserAlreadyExistsError extends ConflictError {
  constructor(message = 'Kullanıcı zaten mevcut.') {
    super(message);
  }
}

export class UserAccessDeniedError extends AccessDeniedError {
  constructor(message = 'Bu kullanıcı işlemi için yetkiniz bulunmamaktadır.') {
    super(message);
  }
}
