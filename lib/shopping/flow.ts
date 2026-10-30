import { validQuantity } from './cart';
export type Language = 'en' | 'hi' | 'hinglish';
export type ShoppingPhase = 'PRODUCT_EXPLORATION' | 'AWAITING_QUANTITY' | 'AWAITING_NEXT_ACTION' | 'CHECKOUT' | 'COMPLETED';
export type HandoffPhase = 'NONE' | 'AWAITING_TIMING_CHOICE' | 'INSTANT_REQUESTED' | 'SCHEDULE_REQUESTED' | 'CONNECTING' | 'CONNECTED' | 'SCHEDULED' | 'FAILED';
export interface ShoppingFlow {
    phase: ShoppingPhase;
    handoff: HandoffPhase;
    productId: string | null;
    language: Language;
    reason: 'pricing' | 'human-help';
}
export const initialFlow: ShoppingFlow = { phase: 'PRODUCT_EXPLORATION', handoff: 'NONE', productId: null, language: 'en', reason: 'human-help' };
export type ShopAction = {
    type: 'ADD_TO_CART';
    productId: string;
    quantity: number;
} | {
    type: 'OPEN_CHECKOUT';
} | {
    type: 'CONTINUE_EXPLORING';
} | {
    type: 'OFFER_HUMAN_HANDOFF';
} | {
    type: 'CREATE_INSTANT_HANDOFF';
} | {
    type: 'START_SCHEDULE_HANDOFF';
    text: string;
} | {
    type: 'CONFIRM_SCHEDULE';
} | {
    type: 'FEEDBACK';
    code: FeedbackCode;
};
export type FeedbackCode = 'quantity' | 'invalidQuantity' | 'added' | 'next' | 'continue' | 'offer' | 'pricing' | 'schedule' | 'scheduleConfirm' | 'scheduled' | 'meeting' | 'failed' | 'cartFailed' | 'select' | 'cancel' | 'savedCallback';
export function languageOf(text: string, previous: Language): Language {
    if (/[\u0900-\u097f]/u.test(text))
        return 'hi';
    if (/\b(mujhe|chahiye|karo|kar do|thoda|mil|sakta|hai|abhi|baad|kal|haan|nahi|do chahiye)\b/i.test(text))
        return 'hinglish';
    return /[a-z]{3,}/i.test(text) ? 'en' : previous;
}
const numbers: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, ek: 1, do: 2, teen: 3, char: 4, paanch: 5, che: 6, saat: 7, aath: 8, nau: 9, das: 10, 'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10 };
export function quantityOf(text: string): number | null {
    const normalized = text.toLowerCase().replace(/[०-९]/g, c => String(c.charCodeAt(0) - 2406));
    if (/\b(minus|negative|half|hundred|thousand|million|lakh)\b|आधा|सौ|हजार|\d\s*\/\s*\d/u.test(normalized))
        return NaN;
    const digits = normalized.match(/-?\d+(?:\.\d+)?/g);
    if (digits)
        return digits.length === 1 ? Number(digits[0]) : NaN;
    const words = normalized.replace(/[.,!?।]/g, '').split(/[\s-]+/);
    const found = words.filter(w => numbers[w] !== undefined && !(w === 'do' && words.length > 1 && /kar do/.test(normalized))).map(w => numbers[w]);
    if (!found.length)
        return null;
    if (found.length === 2 && found[0] >= 20 && found[0] % 10 === 0 && found[1] > 0 && found[1] < 10)
        return found[0] + found[1];
    return found.length === 1 ? found[0] : NaN;
}
export function decide(flow: ShoppingFlow, text: string): {
    flow: ShoppingFlow;
    action: ShopAction | null;
} {
    const t = text.toLowerCase().replace(/[’']/g, "'").trim();
    const next = { ...flow, language: languageOf(t, flow.language) };
    const result = (action: ShopAction | null) => ({ flow: next, action });
    // A rejected future option is not a request to schedule (e.g. "not later, connect me").
    const requestText = t.replace(/\b(?:not later|(?:don't|do not)\s+(?:want to\s+)?(?:schedule|book)(?:\s+(?:a\s+)?(?:call|callback|meeting))?|no scheduling)\b/g, '').trim();
    const later = /\b(later|tomorrow|schedule|scheduled|evening|afternoon|morning|tonight|next week|next month|not now|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{4}-\d{2}-\d{2}\b|\bat\s+\d{1,2}(?::\d{2})?\b|\bin\s+\d+\s+(?:minutes?|hours?|days?)\b|बाद|कल|शाम|baad|kal/u.test(requestText);
    const now = /\b(now|immediately|instantly|right away|straight away|abhi)\b|अभी/u.test(t) && !later && !/\b(?:not|don't|do not)\s+(?:want\s+(?:it\s+)?)?(?:instantly|immediately|right away|now)\b/u.test(t);
    const declined = /\b(?:don't|do not|no need|not interested|not now|not instantly|not immediately|if|example)\b|नहीं/u.test(requestText);
    const callRequest = !declined && /\b(?:(?:want|like|need)(?:\s+to\s+(?:have|start|join|make|get|arrange))?\s+(?:a |an |the )?(?:video |phone )?(?:call|meeting|callback)|(?:have|start|join|arrange|request|make|set up)\s+(?:a |an |the )?(?:video |phone )?(?:call|meeting|callback)|(?:call|phone|ring) me|(?:can|could|may) (?:we|i)\s+(?:have a |start a |join a )?(?:call|meet)|let'?s\s+(?:have a |start a )?(?:call|meet))\b|^(?:a )?(?:video call|call|meeting|callback)[.!?\s]*$|(?:call|meeting).{0,15}(?:chahiye|karo|kijiye)|कॉल.{0,15}(?:चाहिए|करें|करो)/u.test(t);
    const directConnect = !declined && (
        /\b(?:connect|transfer|put)\s+(?:me|us)(?:\s+through)?\b|\b(?:can|could|may|shall)\s+we\s+connect\b|\blet'?s\s+connect\b|\b(?:want|need|like)\s+to\s+connect\b|^(?:please\s+)?connect(?:\s+(?:now|instantly|immediately|please))?[.!?\s]*$|\bconnect\s+(?:karo|kar do|kijiye)\b|कनेक्ट\s*(?:करो|करें|कीजिए)/u.test(requestText)
        || /^(?:(?:yes|okay|ok|please)[,!.\s]+)*(?:right now|now|instantly|immediately|right away|straight away|abhi|अभी)(?:[,!.\s]+please)?[.!?\s]*$/u.test(requestText)
        || /^i\s+(?:want|need|would like)\s+(?:to have\s+)?(?:it|that)(?:\s+to happen)?\s+(?:right now|now|instantly|immediately)[.!?\s]*$/u.test(requestText)
    );
    const human = directConnect || !declined && /\b(?:(?:speak|talk|connect|chat|meet|transfer|contact|help).{0,25}(?:human|person|someone|team|representative|specialist|support|agent)|(?:want|need|like)(?:\s+to\s+(?:speak|talk|connect))?.{0,18}(?:human|representative|specialist|support agent))\b|(?:इंसान|व्यक्ति|टीम|प्रतिनिधि).{0,25}(?:बात|मदद|जोड़)|^(?:human(?: agent)?(?: help| please| now| se connect karo)?|customer support|live agent|representative|specialist|support|team help)[.!?\s]*$/u.test(t);
    const meetingLink = /\b(?:meeting|call|video call|waiting room)\s+(?:link|url)\b|(?:मीटिंग|कॉल).{0,12}लिंक/u.test(t)
        && !/\b(?:what is|what's|how does|if|example|don't|do not|no need)\b|नहीं/u.test(t);
    const callbackRequest = /\b(?:schedule|book|arrange|request).{0,24}(?:call|callback|meeting)\b|\bcall(?:back)?\s+(?:me\s+)?(?:later|tomorrow)\b/u.test(t)
        && !/\b(?:if|example|don't|do not)\b/u.test(t);
    const discount = /\b(discounts?|bargain(?:ing)?|negotiat(?:e|ion|ing)|deals?|best price|special price|custom pric(?:e|ing)|bulk pric(?:e|ing)|price match(?:ing)?|too expensive)\b|(?:reduce|lower|change|adjust).{0,20}price|can you do.{0,8}[₹\d]|कम कर|discount|thoda kam/u.test(t);
    if (/\b(cancel|never mind|nevermind|don't want to buy|do not want to buy|don't buy|do not buy|don't add|do not add|don't connect|do not connect|don't call|do not call)\b|नहीं चाहिए/u.test(t)) {
        if (next.handoff === 'SCHEDULED')
            return result({ type: 'FEEDBACK', code: 'savedCallback' });
        next.phase = 'PRODUCT_EXPLORATION';
        next.handoff = 'NONE';
        return result({ type: 'FEEDBACK', code: 'cancel' });
    }
    const continued = /\b(continue|look around|keep looking|keep exploring|show me more|not yet|explore|exploring)\b|और देख|aur dekh/u.test(t);
    if (continued && !['INSTANT_REQUESTED', 'CONNECTING', 'CONNECTED'].includes(next.handoff)) {
        next.phase = 'COMPLETED';
        next.handoff = 'NONE';
        return result({ type: 'CONTINUE_EXPLORING' });
    }
    // An immediate choice replaces an unfinished callback, even without human keywords.
    if (['SCHEDULE_REQUESTED', 'AWAITING_TIMING_CHOICE', 'FAILED'].includes(next.handoff) && now) {
        next.phase = 'PRODUCT_EXPLORATION';
        next.handoff = 'INSTANT_REQUESTED';
        return result({ type: 'CREATE_INSTANT_HANDOFF' });
    }
    // Repeated handoff requests must reuse the room already being created.
    if ((meetingLink || human || callRequest || callbackRequest) && ['INSTANT_REQUESTED', 'CONNECTING', 'CONNECTED'].includes(next.handoff))
        return result(null);
    if (human || discount || meetingLink || callbackRequest || callRequest || ['AWAITING_TIMING_CHOICE', 'FAILED'].includes(next.handoff)) {
        // An unanswered handoff offer must not consume ordinary product questions.
        if (!human && !discount && !meetingLink && !callbackRequest && !callRequest && !now && !later) return result(null);
        next.phase = 'PRODUCT_EXPLORATION';
        if (human || discount || meetingLink || callRequest)
            next.reason = discount ? 'pricing' : 'human-help';
        if (later || callbackRequest && /\b(book|schedule)\b/.test(t) && !now) {
            next.handoff = 'SCHEDULE_REQUESTED';
            return result({ type: 'START_SCHEDULE_HANDOFF', text });
        }
        if (now || meetingLink || human || callRequest || callbackRequest) {
            next.handoff = 'INSTANT_REQUESTED';
            return result({ type: 'CREATE_INSTANT_HANDOFF' });
        }
        next.handoff = 'AWAITING_TIMING_CHOICE';
        return result({ type: 'OFFER_HUMAN_HANDOFF' });
    }
    if (next.handoff === 'SCHEDULE_REQUESTED') {
        if (/^(yes|confirm|correct|haan|हाँ|हां|सही)[.!।\s]*$/u.test(t))
            return result({ type: 'CONFIRM_SCHEDULE' });
        return result({ type: 'START_SCHEDULE_HANDOFF', text });
    }
    if (['INSTANT_REQUESTED', 'CONNECTING', 'CONNECTED'].includes(next.handoff))
        return result(null);
    if (/\b(check\s?out|pay now|complete order)\b|checkout कर/u.test(t) || next.phase === 'AWAITING_NEXT_ACTION' && /let's buy|i'm done/.test(t)) {
        next.phase = 'CHECKOUT';
        return result({ type: 'OPEN_CHECKOUT' });
    }
    const purchase = /\b(i (?:would like|want|wish) to (?:buy|purchase|order)|i'?d like (?:to buy|to purchase|to order|this|these)|can i (?:buy|order)|i need (?:this|these|it)|i'?ll take|i want (?:to buy|to purchase|this|these|it|\d+|one|two|three|four|five)|add (?:this|it|these|\d+|one|two|three|four|five)|buy (?:this|it|these)|let'?s get|i'?ll purchase)\b|मुझे.*चाहिए|cart.*(?:add|जोड़)|इसे.*(?:खरीद|जोड़)|mujhe.*chahiye/u.test(t);
    // A shopper may ask another product question before answering quantity.
    // Numbers in those questions must never become cart additions.
    if (!purchase && next.phase === 'AWAITING_QUANTITY' &&
        (/\?/.test(t) || /^(?:is|are|does|do|can|could|will|would|what|which|why|how|kya|क्या)\s/iu.test(t)))
        return result(null);
    if (purchase || next.phase === 'AWAITING_QUANTITY') {
        if (!next.productId)
            return result({ type: 'FEEDBACK', code: 'select' });
        const q = quantityOf(t);
        if (q === null) {
            next.phase = 'AWAITING_QUANTITY';
            return result({ type: 'FEEDBACK', code: purchase ? 'quantity' : 'invalidQuantity' });
        }
        if (!validQuantity(q)) {
            next.phase = 'AWAITING_QUANTITY';
            return result({ type: 'FEEDBACK', code: 'invalidQuantity' });
        }
        next.phase = 'AWAITING_NEXT_ACTION';
        return result({ type: 'ADD_TO_CART', productId: next.productId, quantity: q });
    }
    return result(null);
}
// A finalized assistant quantity question arms the selected product only; it never adds items.
export function observeQuantityPrompt(flow: ShoppingFlow, text: string): ShoppingFlow {
    if (!flow.productId || flow.handoff !== 'NONE' || flow.phase !== 'PRODUCT_EXPLORATION') return flow;
    const asking = /how many.{0,50}(?:like|want|need|add|buy|purchase|order)|what quantity|(?:कितने|कितनी).{0,30}(?:चाहिए|चाहेंगे|लेना)|kitne.{0,30}(?:chahiye|lenge)/iu.test(text);
    return asking ? { ...flow, phase: 'AWAITING_QUANTITY' } : flow;
}
export class ActionLedger {
    private ids = new Set<string>();
    claim(id: string) { if (this.ids.has(id))
        return false; this.ids.add(id); return true; }
}
export function feedback(code: FeedbackCode, language: Language, name = '', quantity = 0): string {
    const copy: Record<FeedbackCode, [
        string,
        string,
        string
    ]> = {
        quantity: ['Great choice. How many would you like?', 'बढ़िया। आपको कितने चाहिए?', 'Great choice! Kitne chahiye?'],
        invalidQuantity: ['Please choose a whole number between 1 and 99.', 'कृपया 1 से 99 के बीच पूरी संख्या बताएं।', 'Please 1 se 99 ke beech whole number bataiye.'],
        added: [`Done. I’ve added ${quantity} ${name} to your cart. Checkout or continue exploring?`, `${quantity} ${name} आपके कार्ट में जोड़ दिए हैं। चेकआउट करेंगे या और देखेंगे?`, `${quantity} ${name} cart mein add ho gaye. Checkout karenge ya aur explore?`],
        next: ['Checkout or continue exploring?', 'चेकआउट करेंगे या और देखेंगे?', 'Checkout ya aur explore?'],
        continue: ['Of course. Keep exploring; select another product whenever you need me.', 'ज़रूर। और देखिए, मदद के लिए कोई भी प्रोडक्ट चुनिए।', 'Bilkul, explore kijiye. Help chahiye toh product select kijiye.'],
        offer: ['Sure. Would you like to speak with someone now, or request a call for later?', 'ज़रूर। अभी किसी से बात करेंगे या बाद के लिए कॉल का अनुरोध करेंगे?', 'Sure. Abhi kisi se baat karni hai ya later ke liye call request?'],
        pricing: ["I can’t change the price. Would you like to speak with our team now, or request a call for later?", 'मैं कीमत नहीं बदल सकती। अभी हमारी टीम से बात करेंगे या बाद में कॉल का अनुरोध करेंगे?', 'Main price change nahi kar sakti. Team se abhi baat karni hai ya later call request?'],
        schedule: ['What date and time works for you? Please review the time and timezone in the confirmation popup.', 'कौन सी तारीख और समय ठीक रहेगा? कॉल फॉर्म में समय और टाइमज़ोन की पुष्टि करें।', 'Kaunsi date aur time sahi hai? Callback form mein time aur timezone confirm kijiye.'],
        scheduleConfirm: ['Please review the date, time and timezone in the popup, then select Okay, confirm to save your callback request.', 'कॉल अनुरोध सेव करने से पहले दिखाई गई तारीख, समय और टाइमज़ोन की पुष्टि करें।', 'Save karne se pehle date, time aur timezone confirm kijiye.'],
        scheduled: ['Your demo callback request is saved. You can continue exploring. This is a request, not a confirmed appointment.', 'आपका डेमो कॉल अनुरोध सेव हो गया। आप और देख सकते हैं। यह अनुरोध है, पक्की बुकिंग नहीं।', 'Demo callback request save ho gayi. Explore kijiye. Yeh request hai, confirmed appointment nahi.'],
        meeting: ['Your meeting link is ready. I’ll open the waiting room for you. No representative is connected yet.', 'मीटिंग लिंक तैयार है। मैं आपके लिए वेटिंग रूम खोल रही हूँ। अभी कोई प्रतिनिधि नहीं जुड़ा है।', 'Meeting link ready hai. Main aapke liye waiting room khol rahi hoon. Abhi koi representative connected nahi hai.'],
        failed: ['I couldn’t start that request. Please retry, or schedule a call instead.', 'अनुरोध शुरू नहीं हो सका। फिर कोशिश करें या बाद के लिए कॉल चुनें।', 'Request start nahi hui. Retry kijiye ya later call schedule kijiye.'],
        cartFailed: ['I couldn’t save that cart change. Please try again.', 'कार्ट में बदलाव सेव नहीं हुआ। फिर कोशिश करें।', 'Cart change save nahi hua. Please retry kijiye.'],
        select: ['Please select a product first.', 'पहले कोई प्रोडक्ट चुनिए।', 'Pehle product select kijiye.'],
        savedCallback: ['That demo callback request was already saved. Cancellation is not supported here; no automatic call or appointment was booked.', 'डेमो कॉल अनुरोध सेव हो चुका है। यहाँ उसे रद्द करने की सुविधा नहीं है। कोई अपने आप कॉल या पक्की बुकिंग नहीं हुई है।', 'Demo callback request save ho chuki hai. Yahan cancellation available nahi hai. Koi automatic call ya confirmed booking nahi hui.'],
        cancel: ['Okay, I’ve cancelled that shopping request.', 'ठीक है, वह अनुरोध रद्द कर दिया।', 'Theek hai, request cancel kar di.']
    };
    return copy[code][language === 'hi' ? 1 : language === 'hinglish' ? 2 : 0];
}
