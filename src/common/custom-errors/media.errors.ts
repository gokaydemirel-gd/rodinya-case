import { DomainError, type DomainErrorKind } from './domain.errors';

export class MediaDomainError extends DomainError {
  constructor(message: string, kind: DomainErrorKind = 'validation') {
    super(message, kind);
  }
}

export class MediaNotFoundError extends MediaDomainError {
  constructor(message = 'Medya bulunamadı.') {
    super(message, 'not_found');
  }
}

export class PhysicalFileNotFoundError extends MediaDomainError {
  constructor(
    message = 'Fiziksel medya dosyası depolama alanında bulunamadı.',
  ) {
    super(message, 'not_found');
  }
}

export class MediaAccessDeniedError extends MediaDomainError {
  constructor(message = 'Bu medyaya erişim yetkiniz bulunmamaktadır.') {
    super(message, 'forbidden');
  }
}

export class MediaOwnerOnlyError extends MediaDomainError {
  constructor(message = 'Bu işlemi yalnızca medya sahibi yapabilir.') {
    super(message, 'forbidden');
  }
}

export class InvalidMediaFileError extends MediaDomainError {
  constructor(message = 'Lütfen yüklenecek geçerli bir dosya sağlayın.') {
    super(message);
  }
}

export class InvalidMediaMimeTypeError extends MediaDomainError {
  constructor(message = 'Sadece JPEG formatında görseller kabul edilir.') {
    super(message);
  }
}

export class MediaFileSizeExceededError extends MediaDomainError {
  constructor(message = 'Dosya boyutu en fazla 5MB olabilir.') {
    super(message);
  }
}

export class InvalidPermissionActionError extends MediaDomainError {
  constructor(
    message = 'Geçersiz izin işlemi. Sadece "add" veya "remove" kullanılabilir.',
  ) {
    super(message);
  }
}

export class SelfPermissionModificationError extends MediaDomainError {
  constructor(message = 'Medya sahibi kendi izinlerini değiştiremez.') {
    super(message);
  }
}
