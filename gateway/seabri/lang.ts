export type Locale = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'ar' | 'zh' | 'ja' | 'ko' | 'hi' | 'ru' | 'tr'

const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'pt', 'fr', 'de', 'ar', 'zh', 'ja', 'ko', 'hi', 'ru', 'tr']

/**
 * Detect locale from text using Unicode script ranges.
 * Non-Latin scripts are identified by codepoint ranges; Latin scripts default to 'en'.
 * For production Latin-script detection, route through the nanobot MCP langdetect tool.
 */
export function detectLocale(text: string): Locale {
  if (!text || text.trim() === '') return 'en'

  let arabicCount = 0
  let chineseCount = 0
  let japaneseCount = 0
  let koreanCount = 0
  let hindiCount = 0
  let cyrillicCount = 0

  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    if (cp >= 0x0600 && cp <= 0x06FF) arabicCount++
    else if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF)) chineseCount++
    else if ((cp >= 0x3040 && cp <= 0x309F) || (cp >= 0x30A0 && cp <= 0x30FF)) japaneseCount++
    else if (cp >= 0xAC00 && cp <= 0xD7AF) koreanCount++
    else if (cp >= 0x0900 && cp <= 0x097F) hindiCount++
    else if (cp >= 0x0400 && cp <= 0x04FF) cyrillicCount++
  }

  const len = text.length
  const threshold = len * 0.1

  if (arabicCount > threshold) return 'ar'
  if (japaneseCount > threshold) return 'ja'
  if (koreanCount > threshold) return 'ko'
  if (hindiCount > threshold) return 'hi'
  if (cyrillicCount > threshold) return 'ru'
  // Chinese check after Japanese — kanji overlap
  if (chineseCount > threshold) return 'zh'

  return 'en'
}

/** Type-guard for supported locales */
export function isSupportedLocale(code: string): code is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(code)
}

// ---------------------------------------------------------------------------
// Minimal message catalog — UI strings for the 8 key system messages
// ---------------------------------------------------------------------------

type MessageKey =
  | 'access_denied'
  | 'approval_prompt'
  | 'approval_expired'
  | 'approved'
  | 'denied'
  | 'unknown_command'
  | 'switched_agent'
  | 'session_started'

type Catalog = Record<MessageKey, string>

const CATALOG: Record<Locale, Catalog> = {
  en: {
    access_denied: 'Access denied. You are not authorized to use this service.',
    approval_prompt: 'Confirm? Reply YES or NO.',
    approval_expired: 'The pending action has expired. Please try again.',
    approved: 'Action approved. Proceeding.',
    denied: 'Action cancelled.',
    unknown_command: 'Unknown command. Try /help to see available commands.',
    switched_agent: 'Switched agent.',
    session_started: 'Session started.',
  },
  es: {
    access_denied: 'Acceso denegado. No estás autorizado para usar este servicio.',
    approval_prompt: '¿Confirmar? Responde SÍ o NO.',
    approval_expired: 'La acción pendiente ha caducado. Por favor, inténtalo de nuevo.',
    approved: 'Acción aprobada. Procediendo.',
    denied: 'Acción cancelada.',
    unknown_command: 'Comando desconocido. Prueba /help para ver los comandos disponibles.',
    switched_agent: 'Agente cambiado.',
    session_started: 'Sesión iniciada.',
  },
  pt: {
    access_denied: 'Acesso negado. Você não está autorizado a usar este serviço.',
    approval_prompt: 'Confirmar? Responda SIM ou NÃO.',
    approval_expired: 'A ação pendente expirou. Tente novamente.',
    approved: 'Ação aprovada. Prosseguindo.',
    denied: 'Ação cancelada.',
    unknown_command: 'Comando desconhecido. Tente /help para ver os comandos disponíveis.',
    switched_agent: 'Agente alterado.',
    session_started: 'Sessão iniciada.',
  },
  fr: {
    access_denied: 'Accès refusé. Vous n\'êtes pas autorisé à utiliser ce service.',
    approval_prompt: 'Confirmer ? Répondez OUI ou NON.',
    approval_expired: 'L\'action en attente a expiré. Veuillez réessayer.',
    approved: 'Action approuvée. En cours.',
    denied: 'Action annulée.',
    unknown_command: 'Commande inconnue. Essayez /help pour voir les commandes disponibles.',
    switched_agent: 'Agent changé.',
    session_started: 'Session démarrée.',
  },
  de: {
    access_denied: 'Zugriff verweigert. Sie sind nicht berechtigt, diesen Dienst zu nutzen.',
    approval_prompt: 'Bestätigen? Antworten Sie mit JA oder NEIN.',
    approval_expired: 'Die ausstehende Aktion ist abgelaufen. Bitte versuchen Sie es erneut.',
    approved: 'Aktion genehmigt. Wird ausgeführt.',
    denied: 'Aktion abgebrochen.',
    unknown_command: 'Unbekannter Befehl. Versuchen Sie /help für verfügbare Befehle.',
    switched_agent: 'Agent gewechselt.',
    session_started: 'Sitzung gestartet.',
  },
  ar: {
    access_denied: 'تم رفض الوصول. أنت غير مصرح لك باستخدام هذه الخدمة.',
    approval_prompt: 'تأكيد؟ أجب بنعم أو لا.',
    approval_expired: 'انتهت صلاحية الإجراء المعلق. يرجى المحاولة مرة أخرى.',
    approved: 'تمت الموافقة على الإجراء. جارٍ التنفيذ.',
    denied: 'تم إلغاء الإجراء.',
    unknown_command: 'أمر غير معروف. جرب /help لرؤية الأوامر المتاحة.',
    switched_agent: 'تم تغيير الوكيل.',
    session_started: 'بدأت الجلسة.',
  },
  zh: {
    access_denied: '访问被拒绝。您无权使用此服务。',
    approval_prompt: '确认？请回复"是"或"否"。',
    approval_expired: '待处理操作已过期。请重试。',
    approved: '操作已批准。正在执行。',
    denied: '操作已取消。',
    unknown_command: '未知命令。请尝试 /help 查看可用命令。',
    switched_agent: '助手已切换。',
    session_started: '会话已开始。',
  },
  ja: {
    access_denied: 'アクセスが拒否されました。このサービスを使用する権限がありません。',
    approval_prompt: '確認しますか？「はい」または「いいえ」で返信してください。',
    approval_expired: '保留中のアクションが期限切れになりました。もう一度お試しください。',
    approved: 'アクションが承認されました。実行中。',
    denied: 'アクションがキャンセルされました。',
    unknown_command: '不明なコマンドです。使用可能なコマンドを確認するには /help を試してください。',
    switched_agent: 'エージェントが切り替えられました。',
    session_started: 'セッションが開始されました。',
  },
  ko: {
    access_denied: '액세스가 거부되었습니다. 이 서비스를 사용할 권한이 없습니다.',
    approval_prompt: '확인하시겠습니까? 예 또는 아니오로 답변해 주세요.',
    approval_expired: '보류 중인 작업이 만료되었습니다. 다시 시도해 주세요.',
    approved: '작업이 승인되었습니다. 진행 중.',
    denied: '작업이 취소되었습니다.',
    unknown_command: '알 수 없는 명령입니다. 사용 가능한 명령을 보려면 /help를 시도하세요.',
    switched_agent: '에이전트가 전환되었습니다.',
    session_started: '세션이 시작되었습니다.',
  },
  hi: {
    access_denied: 'पहुँच अस्वीकृत। आपको इस सेवा का उपयोग करने की अनुमति नहीं है।',
    approval_prompt: 'पुष्टि करें? हाँ या नहीं में उत्तर दें।',
    approval_expired: 'लंबित कार्रवाई की समय-सीमा समाप्त हो गई। कृपया पुनः प्रयास करें।',
    approved: 'कार्रवाई स्वीकृत। आगे बढ़ रहे हैं।',
    denied: 'कार्रवाई रद्द की गई।',
    unknown_command: 'अज्ञात आदेश। उपलब्ध आदेश देखने के लिए /help आज़माएं।',
    switched_agent: 'एजेंट बदला गया।',
    session_started: 'सत्र शुरू हुआ।',
  },
  ru: {
    access_denied: 'Доступ запрещён. Вы не авторизованы для использования этого сервиса.',
    approval_prompt: 'Подтвердить? Ответьте ДА или НЕТ.',
    approval_expired: 'Ожидающее действие истекло. Пожалуйста, попробуйте снова.',
    approved: 'Действие одобрено. Выполняется.',
    denied: 'Действие отменено.',
    unknown_command: 'Неизвестная команда. Попробуйте /help для просмотра доступных команд.',
    switched_agent: 'Агент изменён.',
    session_started: 'Сессия начата.',
  },
  tr: {
    access_denied: 'Erişim reddedildi. Bu hizmeti kullanmaya yetkili değilsiniz.',
    approval_prompt: 'Onaylıyor musunuz? EVET veya HAYIR ile yanıtlayın.',
    approval_expired: 'Bekleyen işlem süresi doldu. Lütfen tekrar deneyin.',
    approved: 'İşlem onaylandı. Devam ediliyor.',
    denied: 'İşlem iptal edildi.',
    unknown_command: 'Bilinmeyen komut. Mevcut komutları görmek için /help deneyin.',
    switched_agent: 'Ajan değiştirildi.',
    session_started: 'Oturum başlatıldı.',
  },
}

/** Look up a localized string; falls back to English when locale is unsupported */
export function t(key: MessageKey, locale: Locale): string {
  const catalog = CATALOG[locale] ?? CATALOG['en']
  return catalog[key] ?? CATALOG['en'][key]
}
