import Swal from 'sweetalert2';

const DEFAULT_CONFIRM_COLOR =
    '#dc2626';

const DEFAULT_CANCEL_COLOR =
    '#64748b';

const DEFAULT_OPTIONS = {
    buttonsStyling:
        true,

    heightAuto:
        false,

    scrollbarPadding:
        false,

    allowOutsideClick:
        true,

    allowEscapeKey:
        true,

    customClass: {
        popup:
            'rounded-5',

        confirmButton:
            'rounded-pill px-4',

        cancelButton:
            'rounded-pill px-4',
    },
};

const fireAlert = (
    options = {}
) => {
    if (
        Swal.isVisible() &&
        !options.allowReplace
    ) {
        Swal.close();
    }

    const {
        allowReplace,
        ...alertOptions
    } = options;

    return Swal.fire({
        ...DEFAULT_OPTIONS,
        ...alertOptions,

        customClass: {
            ...DEFAULT_OPTIONS.customClass,
            ...(alertOptions.customClass ||
                {}),
        },
    });
};

export const showSuccessAlert = (
    title,
    text = ''
) => {
    return fireAlert({
        icon:
            'success',

        title,

        text,

        confirmButtonText:
            'Oke',

        confirmButtonColor:
            '#16a34a',

        timer:
            2200,

        timerProgressBar:
            true,
    });
};

export const showErrorAlert = (
    title,
    text = ''
) => {
    return fireAlert({
        icon:
            'error',

        title,

        text,

        confirmButtonText:
            'Mengerti',

        confirmButtonColor:
            '#dc2626',
    });
};

export const showWarningAlert = (
    title,
    text = ''
) => {
    return fireAlert({
        icon:
            'warning',

        title,

        text,

        confirmButtonText:
            'Oke',

        confirmButtonColor:
            '#f59e0b',
    });
};

export const showInfoAlert = (
    title,
    text = ''
) => {
    return fireAlert({
        icon:
            'info',

        title,

        text,

        confirmButtonText:
            'Oke',

        confirmButtonColor:
            '#2563eb',
    });
};

export const showConfirmAlert = ({
    title =
        'Apakah kamu yakin?',

    text =
        'Aksi ini akan diproses.',

    confirmButtonText =
        'Ya, lanjutkan',

    cancelButtonText =
        'Batal',

    icon =
        'question',

    confirmButtonColor =
        DEFAULT_CONFIRM_COLOR,

    cancelButtonColor =
        DEFAULT_CANCEL_COLOR,

    reverseButtons =
        true,

    focusCancel =
        true,
} = {}) => {
    return fireAlert({
        icon,

        title,

        text,

        showCancelButton:
            true,

        confirmButtonText,

        cancelButtonText,

        confirmButtonColor,

        cancelButtonColor,

        reverseButtons,

        focusCancel,
    });
};

export const showTextareaAlert = ({
    title =
        'Masukkan catatan',

    text =
        '',

    inputLabel =
        'Catatan',

    inputPlaceholder =
        'Tuliskan catatan...',

    confirmButtonText =
        'Simpan',

    cancelButtonText =
        'Batal',

    confirmButtonColor =
        DEFAULT_CONFIRM_COLOR,

    minimumLength =
        5,

    maximumLength =
        2000,

    required =
        true,
} = {}) => {
    return fireAlert({
        icon:
            'warning',

        title,

        text,

        input:
            'textarea',

        inputLabel,

        inputPlaceholder,

        inputAttributes: {
            maxlength:
                maximumLength,

            autocapitalize:
                'sentences',

            rows:
                5,
        },

        showCancelButton:
            true,

        confirmButtonText,

        cancelButtonText,

        confirmButtonColor,

        cancelButtonColor:
            DEFAULT_CANCEL_COLOR,

        reverseButtons:
            true,

        focusCancel:
            true,

        inputValidator:
            (value) => {
                const normalizedValue =
                    value?.trim() ||
                    '';

                if (
                    required &&
                    !normalizedValue
                ) {
                    return `${inputLabel} wajib diisi.`;
                }

                if (
                    normalizedValue &&
                    normalizedValue.length <
                        minimumLength
                ) {
                    return `${inputLabel} minimal ${minimumLength} karakter.`;
                }

                if (
                    normalizedValue.length >
                    maximumLength
                ) {
                    return `${inputLabel} maksimal ${maximumLength} karakter.`;
                }

                return undefined;
            },
    });
};

const normalizeUrl = (
    value
) => {
    const trimmedValue =
        value?.trim() ||
        '';

    if (!trimmedValue) {
        return '';
    }

    if (
        /^https?:\/\//i.test(
            trimmedValue
        )
    ) {
        return trimmedValue;
    }

    return `https://${trimmedValue}`;
};

const isValidHttpUrl = (
    value
) => {
    try {
        const parsedUrl =
            new URL(
                normalizeUrl(
                    value
                )
            );

        return [
            'http:',
            'https:',
        ].includes(
            parsedUrl.protocol
        );
    } catch {
        return false;
    }
};

const escapeHtml = (
    value
) => {
    return String(
        value || ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
};

export const showCompletionAlert = ({
    title =
        'Selesaikan request?',

    text =
        'Masukkan link hasil pekerjaan yang akan diberikan kepada pemohon.',

    confirmButtonText =
        'Simpan dan Selesaikan',

    cancelButtonText =
        'Batal',
} = {}) => {
    return fireAlert({
        icon:
            'question',

        title:
            escapeHtml(
                title
            ),

        text,

        html: `
            <div class="text-start mt-3">
                <label
                    for="swal-result-link"
                    class="form-label fw-bold"
                >
                    Link Hasil Pekerjaan
                    <span class="text-danger">*</span>
                </label>

                <div class="input-group mb-3">
                    <span class="input-group-text">
                        <i class="bi bi-link-45deg"></i>
                    </span>

                    <input
                        id="swal-result-link"
                        type="text"
                        class="form-control"
                        placeholder="https://drive.google.com/..."
                        autocomplete="off"
                        maxlength="2000"
                    />
                </div>

                <label
                    for="swal-result-note"
                    class="form-label fw-bold"
                >
                    Catatan Hasil
                    <span class="text-muted fw-normal">
                        (Opsional)
                    </span>
                </label>

                <textarea
                    id="swal-result-note"
                    class="form-control"
                    rows="4"
                    maxlength="3000"
                    placeholder="Contoh: Dokumentasi telah selesai."
                ></textarea>

                <div class="form-text mt-2">
                    Pastikan link dapat dibuka oleh pemohon.
                </div>
            </div>
        `,

        showCancelButton:
            true,

        confirmButtonText,

        cancelButtonText,

        confirmButtonColor:
            '#16a34a',

        cancelButtonColor:
            DEFAULT_CANCEL_COLOR,

        reverseButtons:
            true,

        focusCancel:
            true,

        didOpen:
            () => {
                document
                    .getElementById(
                        'swal-result-link'
                    )
                    ?.focus();
            },

        preConfirm:
            () => {
                const resultLinkInput =
                    document.getElementById(
                        'swal-result-link'
                    );

                const resultNoteInput =
                    document.getElementById(
                        'swal-result-note'
                    );

                const rawResultLink =
                    resultLinkInput?.value ||
                    '';

                const resultNote =
                    resultNoteInput?.value?.trim() ||
                    '';

                if (
                    !rawResultLink.trim()
                ) {
                    Swal.showValidationMessage(
                        'Link hasil pekerjaan wajib diisi.'
                    );

                    return false;
                }

                const normalizedResultLink =
                    normalizeUrl(
                        rawResultLink
                    );

                if (
                    !isValidHttpUrl(
                        normalizedResultLink
                    )
                ) {
                    Swal.showValidationMessage(
                        'Link hasil pekerjaan tidak valid.'
                    );

                    return false;
                }

                if (
                    normalizedResultLink.length >
                    2000
                ) {
                    Swal.showValidationMessage(
                        'Link hasil pekerjaan maksimal 2.000 karakter.'
                    );

                    return false;
                }

                if (
                    resultNote.length >
                    3000
                ) {
                    Swal.showValidationMessage(
                        'Catatan hasil maksimal 3.000 karakter.'
                    );

                    return false;
                }

                return {
                    result_link:
                        normalizedResultLink,

                    result_note:
                        resultNote ||
                        null,
                };
            },
    });
};

export const showLoadingAlert = (
    title =
        'Memproses...',

    text =
        'Mohon tunggu sebentar.'
) => {
    return fireAlert({
        title,

        text,

        allowOutsideClick:
            false,

        allowEscapeKey:
            false,

        showConfirmButton:
            false,

        allowReplace:
            true,

        didOpen:
            () => {
                Swal.showLoading();
            },
    });
};

export const closeAlert = () => {
    if (
        Swal.isVisible()
    ) {
        Swal.close();
    }
};

export const isAlertVisible = () => {
    return Swal.isVisible();
};

export {
    fireAlert,
    isValidHttpUrl,
    normalizeUrl,
};