export type UiLanguage = "pt-BR" | "pt-PT" | "en" | "de" | "fr" | "es";

type UiCopy = {
  welcome: string;
  introEyebrow: string;
  introTitle: string;
  introBody: string;
  approvedContent: string;
  brandSubtitle: string;
  supportName: string;
  available: string;
  restart: string;
  privacy: string;
  today: string;
  now: string;
  segmentLabel: string;
  agro: string;
  urban: string;
  typing: string;
  handoffKicker: string;
  handoffTitle: string;
  handoffBody: string;
  handoffConsent: string;
  commercialButton: string;
  openWhatsApp: string;
  meetingButton: string;
  openMeeting: string;
  protocol: string;
  error: string;
  placeholder: string;
  messageLabel: string;
  send: string;
  consent: string;
  privacyPolicy: string;
};

export const UI_COPY: Record<UiLanguage, UiCopy> = {
  "pt-BR": {
    welcome: "Olá! Agradecemos seu contato com a Zasso. 🌱⚡\n\nSomos pioneiros em Capina Elétrica, uma tecnologia que controla plantas daninhas por meio de energia elétrica, sem o uso de herbicidas.\n\nPara direcionarmos você a um atendimento mais adequado, sobre qual segmento deseja receber informações?",
    introEyebrow: "Atendimento inteligente", introTitle: "Informação certa para a sua operação.", introBody: "Converse com a Zasso, tire dúvidas e conte um pouco sobre a sua necessidade. Ao final, seu contexto segue organizado para o time comercial.", approvedContent: "Conteúdo aprovado pela Zasso", brandSubtitle: "Tecnologia elétrica para o manejo de plantas",
    supportName: "Atendimento Zasso", available: "disponível agora", restart: "Reiniciar", privacy: "Atendimento seguro. Evite enviar dados pessoais sensíveis.", today: "Hoje", now: "agora", segmentLabel: "Escolha seu segmento", agro: "Agro", urban: "Área urbana", typing: "Atendimento está digitando",
    handoffKicker: "Triagem concluída", handoffTitle: "Seu atendimento pode continuar com uma pessoa do nosso time.", handoffBody: "Seu resumo já está preparado para você não precisar repetir tudo.", handoffConsent: "Ao clicar, você concorda em receber contato da Zasso Brasil pelo WhatsApp, inclusive uma retomada do atendimento no próximo dia útil, e declara que leu e aceita nossa", commercialButton: "Falar com o time comercial", openWhatsApp: "Abrir no WhatsApp", meetingButton: "Marcar uma reunião", openMeeting: "Agendar horário", protocol: "Protocolo", error: "Não consegui concluir essa resposta agora. Aguarde um instante e tente novamente.", placeholder: "Digite sua mensagem...", messageLabel: "Mensagem", send: "Enviar mensagem", consent: "Ao continuar, você concorda com o uso dos dados para este atendimento.", privacyPolicy: "Política de Privacidade",
  },
  "pt-PT": {
    welcome: "Olá! Agradecemos o seu contacto com a Zasso. 🌱⚡\n\nSomos pioneiros na Capina Elétrica, uma tecnologia que controla plantas infestantes através de energia elétrica, sem o uso de herbicidas.\n\nPara o encaminharmos para o atendimento mais adequado, sobre que segmento deseja receber informações?",
    introEyebrow: "Atendimento inteligente", introTitle: "Informação certa para a sua operação.", introBody: "Converse com a Zasso, esclareça dúvidas e conte-nos um pouco sobre a sua necessidade. No final, o seu contexto segue organizado para a equipa comercial.", approvedContent: "Conteúdo aprovado pela Zasso", brandSubtitle: "Tecnologia elétrica para o controlo de plantas",
    supportName: "Atendimento Zasso", available: "disponível agora", restart: "Reiniciar", privacy: "Atendimento seguro. Evite enviar dados pessoais sensíveis.", today: "Hoje", now: "agora", segmentLabel: "Escolha o seu segmento", agro: "Agricultura", urban: "Área urbana", typing: "O atendimento está a escrever",
    handoffKicker: "Triagem concluída", handoffTitle: "O seu atendimento pode continuar com uma pessoa da nossa equipa.", handoffBody: "O seu resumo já está preparado para não ter de repetir tudo.", handoffConsent: "Ao clicar, concorda em ser contactado pela Zasso Brasil através do WhatsApp, incluindo uma retoma do atendimento no próximo dia útil, e declara que leu e aceita a nossa", commercialButton: "Falar com a equipa comercial", openWhatsApp: "Abrir no WhatsApp", meetingButton: "Marcar uma reunião", openMeeting: "Agendar horário", protocol: "Protocolo", error: "Não consegui concluir esta resposta. Aguarde um instante e tente novamente.", placeholder: "Escreva a sua mensagem...", messageLabel: "Mensagem", send: "Enviar mensagem", consent: "Ao continuar, concorda com o uso dos dados para este atendimento.", privacyPolicy: "Política de Privacidade",
  },
  en: {
    welcome: "Hello! Thank you for contacting Zasso. 🌱⚡\n\nWe are pioneers in Electric Weeding, a technology that controls weeds using electrical energy, without herbicides.\n\nTo direct you to the most appropriate service, which segment would you like information about?",
    introEyebrow: "Intelligent assistance", introTitle: "The right information for your operation.", introBody: "Ask Zasso your questions and tell us a little about your needs. At the end, your context is organized for our sales team.", approvedContent: "Zasso-approved content", brandSubtitle: "Electrical technology for vegetation management",
    supportName: "Zasso Assistance", available: "available now", restart: "Restart", privacy: "Secure assistance. Please avoid sending sensitive personal data.", today: "Today", now: "now", segmentLabel: "Choose your segment", agro: "Agriculture", urban: "Urban area", typing: "Zasso is typing",
    handoffKicker: "Intake completed", handoffTitle: "You can now continue with a member of our team.", handoffBody: "Your summary is ready, so you won’t need to repeat everything.", handoffConsent: "By clicking, you agree to be contacted by Zasso Brasil on WhatsApp, including a follow-up on the next business day, and confirm that you have read and accept our", commercialButton: "Talk to our sales team", openWhatsApp: "Open WhatsApp", meetingButton: "Schedule a meeting", openMeeting: "Book a time", protocol: "Reference", error: "I couldn’t complete that response right now. Please wait a moment and try again.", placeholder: "Type your message...", messageLabel: "Message", send: "Send message", consent: "By continuing, you agree to the use of your data for this service.", privacyPolicy: "Privacy Policy",
  },
  de: {
    welcome: "Hallo! Vielen Dank für Ihre Kontaktaufnahme mit Zasso. 🌱⚡\n\nWir sind Pioniere der elektrischen Unkrautbekämpfung. Die Technologie kontrolliert Unkraut mit elektrischer Energie und ohne Herbizide.\n\nZu welchem Bereich wünschen Sie Informationen, damit wir Sie passend weiterleiten können?",
    introEyebrow: "Intelligente Beratung", introTitle: "Die richtigen Informationen für Ihren Betrieb.", introBody: "Stellen Sie Zasso Ihre Fragen und beschreiben Sie kurz Ihren Bedarf. Anschließend erhält unser Vertrieb Ihren geordneten Kontext.", approvedContent: "Von Zasso freigegebene Inhalte", brandSubtitle: "Elektrische Technologie für das Vegetationsmanagement",
    supportName: "Zasso Beratung", available: "jetzt verfügbar", restart: "Neu starten", privacy: "Sichere Beratung. Bitte senden Sie keine sensiblen persönlichen Daten.", today: "Heute", now: "jetzt", segmentLabel: "Bereich auswählen", agro: "Landwirtschaft", urban: "Stadtbereich", typing: "Zasso schreibt",
    handoffKicker: "Erfassung abgeschlossen", handoffTitle: "Sie können nun mit einer Person aus unserem Team fortfahren.", handoffBody: "Ihre Zusammenfassung ist vorbereitet, damit Sie nichts wiederholen müssen.", handoffConsent: "Mit dem Klick stimmen Sie einer Kontaktaufnahme durch Zasso Brasil über WhatsApp, einschließlich einer erneuten Kontaktaufnahme am nächsten Werktag, zu und bestätigen, dass Sie unsere Datenschutzerklärung gelesen haben und akzeptieren:", commercialButton: "Mit dem Vertrieb sprechen", openWhatsApp: "WhatsApp öffnen", meetingButton: "Termin vereinbaren", openMeeting: "Zeit buchen", protocol: "Vorgang", error: "Die Antwort konnte gerade nicht abgeschlossen werden. Bitte versuchen Sie es gleich erneut.", placeholder: "Nachricht eingeben...", messageLabel: "Nachricht", send: "Nachricht senden", consent: "Wenn Sie fortfahren, stimmen Sie der Datennutzung für diese Beratung zu.", privacyPolicy: "Datenschutzerklärung",
  },
  fr: {
    welcome: "Bonjour ! Merci d’avoir contacté Zasso. 🌱⚡\n\nNous sommes pionniers du désherbage électrique, une technologie qui contrôle les plantes indésirables grâce à l’énergie électrique, sans herbicides.\n\nPour vous orienter vers le service adapté, sur quel secteur souhaitez-vous des informations ?",
    introEyebrow: "Assistance intelligente", introTitle: "La bonne information pour votre activité.", introBody: "Posez vos questions à Zasso et présentez-nous brièvement votre besoin. À la fin, votre contexte est organisé pour notre équipe commerciale.", approvedContent: "Contenu approuvé par Zasso", brandSubtitle: "Technologie électrique pour la gestion de la végétation",
    supportName: "Assistance Zasso", available: "disponible maintenant", restart: "Recommencer", privacy: "Assistance sécurisée. Évitez d’envoyer des données personnelles sensibles.", today: "Aujourd’hui", now: "maintenant", segmentLabel: "Choisissez votre secteur", agro: "Agriculture", urban: "Zone urbaine", typing: "Zasso écrit",
    handoffKicker: "Qualification terminée", handoffTitle: "Vous pouvez maintenant poursuivre avec un membre de notre équipe.", handoffBody: "Votre résumé est prêt, vous n’aurez donc pas à tout répéter.", handoffConsent: "En cliquant, vous acceptez d’être contacté par Zasso Brasil sur WhatsApp, y compris pour une reprise de l’échange le prochain jour ouvré, et confirmez avoir lu et accepté notre", commercialButton: "Parler à l’équipe commerciale", openWhatsApp: "Ouvrir WhatsApp", meetingButton: "Planifier un rendez-vous", openMeeting: "Réserver un créneau", protocol: "Référence", error: "Je n’ai pas pu terminer cette réponse. Patientez un instant et réessayez.", placeholder: "Écrivez votre message...", messageLabel: "Message", send: "Envoyer le message", consent: "En continuant, vous acceptez l’utilisation de vos données pour cette assistance.", privacyPolicy: "Politique de confidentialité",
  },
  es: {
    welcome: "¡Hola! Gracias por contactar con Zasso. 🌱⚡\n\nSomos pioneros en deshierbe eléctrico, una tecnología que controla las plantas no deseadas mediante energía eléctrica, sin herbicidas.\n\nPara orientarle al servicio más adecuado, ¿sobre qué segmento desea recibir información?",
    introEyebrow: "Atención inteligente", introTitle: "La información adecuada para su operación.", introBody: "Haga sus preguntas a Zasso y cuéntenos brevemente qué necesita. Al finalizar, su contexto queda organizado para nuestro equipo comercial.", approvedContent: "Contenido aprobado por Zasso", brandSubtitle: "Tecnología eléctrica para la gestión de la vegetación",
    supportName: "Atención Zasso", available: "disponible ahora", restart: "Reiniciar", privacy: "Atención segura. Evite enviar datos personales sensibles.", today: "Hoy", now: "ahora", segmentLabel: "Elija su segmento", agro: "Agricultura", urban: "Área urbana", typing: "Zasso está escribiendo",
    handoffKicker: "Clasificación completada", handoffTitle: "Ahora puede continuar con una persona de nuestro equipo.", handoffBody: "Su resumen ya está preparado para que no tenga que repetirlo todo.", handoffConsent: "Al hacer clic, acepta que Zasso Brasil se comunique con usted por WhatsApp, incluida una reanudación de la atención el próximo día hábil, y declara que ha leído y acepta nuestra", commercialButton: "Hablar con el equipo comercial", openWhatsApp: "Abrir WhatsApp", meetingButton: "Agendar una reunión", openMeeting: "Reservar un horario", protocol: "Referencia", error: "No pude completar esta respuesta. Espere un momento e inténtelo de nuevo.", placeholder: "Escriba su mensaje...", messageLabel: "Mensaje", send: "Enviar mensaje", consent: "Al continuar, acepta el uso de los datos para esta atención.", privacyPolicy: "Política de privacidad",
  },
};

export function normalizeUiLanguage(value?: string | null): UiLanguage {
  const language = String(value || "").toLocaleLowerCase();
  if (language.startsWith("pt-pt")) return "pt-PT";
  if (language.startsWith("en")) return "en";
  if (language.startsWith("de")) return "de";
  if (language.startsWith("fr")) return "fr";
  if (language.startsWith("es")) return "es";
  return "pt-BR";
}
