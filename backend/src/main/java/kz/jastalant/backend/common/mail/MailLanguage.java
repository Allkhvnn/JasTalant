package kz.jastalant.backend.common.mail;

import org.springframework.context.i18n.LocaleContextHolder;

import java.util.Locale;
import java.util.ResourceBundle;

/** The request language is resolved by Spring MVC from Accept-Language. */
public record MailLanguage(String tag, ResourceBundle messages) {
    public static MailLanguage current() {
        String language = LocaleContextHolder.getLocale().getLanguage();
        String tag = switch (language) {
            case "kk", "en" -> language;
            default -> "ru";
        };
        var bundle = ResourceBundle.getBundle("i18n.mail", Locale.forLanguageTag(tag),
                ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES));
        return new MailLanguage(tag, bundle);
    }

    public String text(String key, Object... arguments) {
        return messages.getString(key).formatted(arguments);
    }
}
