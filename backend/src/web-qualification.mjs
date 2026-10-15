import { normalizeLanguage } from './i18n.mjs';

// Fluxo curto do webchat. Os demais canais continuam usando a qualificação
// original (incluindo área em hectares).
const COPY = Object.freeze({
  'pt-BR': {
    segment: 'Sobre qual segmento você quer informações sobre Capina Elétrica? 🌱 Agro ou 🏙️ Urbano',
    intro: 'Perfeito!\nResponda só mais 3 perguntas rápidas para entendermos melhor sua necessidade e te direcionarmos ao nosso time.',
    region: '1 - 📍 Em qual cidade/estado você está?', name: '2 - Ótimo. Qual é o seu nome?',
    agro: '3 - 🌱 Qual é o principal cultivo da sua operação?', urban: '3 - 🏙️ Onde você pretende utilizar a Capina Elétrica?',
    completed: name => `Obrigado, ${name}! Tudo certo. ✅\nJá temos as informações necessárias para direcionar seu atendimento.\nComo você prefere continuar?`,
  },
  'pt-PT': {
    segment: 'Sobre que segmento deseja receber informações sobre Capina Elétrica? 🌱 Agro ou 🏙️ Urbano',
    intro: 'Perfeito!\nResponda apenas a mais 3 perguntas rápidas para entendermos melhor a sua necessidade e encaminhá-lo para a nossa equipa.',
    region: '1 - 📍 Em que cidade/região está?', name: '2 - Ótimo. Qual é o seu nome?',
    agro: '3 - 🌱 Qual é a principal cultura da sua exploração?', urban: '3 - 🏙️ Onde pretende utilizar a Capina Elétrica?',
    completed: name => `Obrigado, ${name}! Está tudo certo. ✅\nJá temos as informações necessárias para encaminhar o seu atendimento.\nComo prefere continuar?`,
  },
  'en-US': {
    segment: 'Which segment would you like information about? 🌱 Agriculture or 🏙️ Urban',
    intro: 'Perfect!\nPlease answer 3 quick questions so we can better understand your needs and direct you to our team.',
    region: '1 - 📍 Which city/state or region are you in?', name: '2 - Great. What is your name?',
    agro: '3 - 🌱 What is the main crop in your operation?', urban: '3 - 🏙️ Where do you intend to use Electric Weeding?',
    completed: name => `Thank you, ${name}! All set. ✅\nWe now have the information needed to direct your service.\nHow would you like to continue?`,
  },
  'de-DE': {
    segment: 'Zu welchem Bereich wünschen Sie Informationen? 🌱 Landwirtschaft oder 🏙️ Stadtbereich',
    intro: 'Perfekt!\nBitte beantworten Sie noch 3 kurze Fragen, damit wir Ihren Bedarf besser verstehen und Sie an unser Team weiterleiten können.',
    region: '1 - 📍 In welcher Stadt/Region sind Sie tätig?', name: '2 - Sehr gut. Wie heißen Sie?',
    agro: '3 - 🌱 Was ist die wichtigste Kultur in Ihrem Betrieb?', urban: '3 - 🏙️ Wo möchten Sie die elektrische Unkrautbekämpfung einsetzen?',
    completed: name => `Vielen Dank, ${name}! Alles erledigt. ✅\nWir haben nun die notwendigen Informationen für Ihre Weiterleitung.\nWie möchten Sie fortfahren?`,
  },
  'fr-FR': {
    segment: 'Pour quel secteur souhaitez-vous des informations ? 🌱 Agriculture ou 🏙️ Zone urbaine',
    intro: 'Parfait !\nRépondez à seulement 3 questions rapides afin que nous comprenions mieux votre besoin et vous orientions vers notre équipe.',
    region: '1 - 📍 Dans quelle ville/région êtes-vous ?', name: '2 - Très bien. Comment vous appelez-vous ?',
    agro: '3 - 🌱 Quelle est la culture principale de votre exploitation ?', urban: '3 - 🏙️ Où prévoyez-vous d’utiliser le désherbage électrique ?',
    completed: name => `Merci, ${name} ! Tout est prêt. ✅\nNous avons les informations nécessaires pour orienter votre demande.\nComment souhaitez-vous continuer ?`,
  },
  'es-ES': {
    segment: '¿Sobre qué segmento desea información? 🌱 Agricultura o 🏙️ Área urbana',
    intro: '¡Perfecto!\nResponda solo 3 preguntas rápidas para que entendamos mejor su necesidad y le dirijamos a nuestro equipo.',
    region: '1 - 📍 ¿En qué ciudad/región se encuentra?', name: '2 - Muy bien. ¿Cuál es su nombre?',
    agro: '3 - 🌱 ¿Cuál es el cultivo principal de su operación?', urban: '3 - 🏙️ ¿Dónde pretende utilizar el deshierbe eléctrico?',
    completed: name => `Gracias, ${name}. ¡Todo listo! ✅\nYa tenemos la información necesaria para dirigir su atención.\n¿Cómo prefiere continuar?`,
  },
  'it-IT': {
    segment: 'Per quale settore desidera ricevere informazioni? 🌱 Agricoltura o 🏙️ Area urbana',
    intro: 'Perfetto!\nRisponda solo ad altre 3 domande rapide per comprendere meglio le sue esigenze e indirizzarla al nostro team.',
    region: '1 - 📍 In quale città/regione si trova?', name: '2 - Ottimo. Come si chiama?',
    agro: '3 - 🌱 Qual è la coltura principale della sua attività?', urban: '3 - 🏙️ Dove intende utilizzare il diserbo elettrico?',
    completed: name => `Grazie, ${name}! È tutto pronto. ✅\nOra abbiamo le informazioni necessarie per indirizzare la sua richiesta.\nCome preferisce continuare?`,
  },
});

function segmentFrom(value) {
  const normalized = String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
  if (/\b(?:agro|agricultur\w*|agricol\w*|landwirtschaft)\b/u.test(normalized)) return 'agro';
  if (/\b(?:urban\w*|stadtbereich|stadtisch\w*)\b/u.test(normalized)) return 'urban';
  return null;
}

function copyFor(language) {
  return COPY[normalizeLanguage(language)] || COPY['en-US'];
}

export function webQualificationCompletedMessage(state, language = state.language) {
  return copyFor(language).completed(state.contact?.firstName || '');
}

export function advanceWebQualification(state, answer, language = state.language) {
  const value = String(answer || '').trim();
  const copy = copyFor(language);
  const questions = { region: copy.region, name: copy.name, agro_crop: copy.agro, urban_profile: copy.urban };
  let intro = '';
  if (!value) return { messages: [questions[state.stage]], completed: false };
  if (['new', 'segment'].includes(state.stage)) {
    state.stage = 'segment';
    const segment = segmentFrom(value);
    if (!segment) return { messages: [copy.segment], completed: false };
    state.webQualificationVersion = 2;
    state.qualification.segment = segment;
    state.stage = 'region';
    intro = copy.intro;
  } else if (state.stage === 'region') {
    state.qualification.region = value;
    state.stage = 'name';
  } else if (state.stage === 'name') {
    state.contact.firstName = value;
    state.stage = state.qualification.segment === 'agro' ? 'agro_crop' : 'urban_profile';
  } else if (state.stage === 'agro_crop') {
    state.qualification.crop = value;
    state.stage = 'completed';
  } else if (state.stage === 'urban_profile') {
    // Keep the actual intended application, not only a broad profile category.
    state.qualification.urbanProfile = value;
    state.stage = 'completed';
  }
  return {
    messages: [intro, questions[state.stage]].filter(Boolean),
    completed: state.stage === 'completed',
  };
}
