import { TOPICS, pageTopic, instructions, REFUSAL } from './askI2cKnowledge.js';

const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(value || ''));
const offsetOf = value => Math.max(0, Math.min(1000000, Number.parseInt(value, 10) || 0));

export function isI2cGreeting(message) {
  return /^(hi|hello|hey|good\s+(morning|afternoon|evening))[!.\s]*$/i.test(String(message || '').trim());
}

export function boundedI2cHistory(history = []) {
  return [...history]
    .reverse()
    .slice(0, 12)
    .reverse()
    .map(row => ({ role: row.role, content: String(row.content || '').slice(0, 4000) }));
}

export function compactI2cData(value, maxChars = 30000) {
  let text;
  try { text = JSON.stringify(value); } catch { return ''; }
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '…[truncated]';
}

async function getThread(admin, workspaceId, ownerId, id) {
  if (!uuid(id)) throw fail(422, 'Invalid conversation.');
  const { data, error } = await admin
    .from('ask_i2c_conversations')
    .select('id,workspace_id,owner_id,title,page_path,created_at,updated_at,message_count')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function readI2cChat(admin, workspaceId, ownerId, query = {}) {
  const offset = offsetOf(query.offset);

  if (query.action === 'faqs') {
    const key = pageTopic(query.path);
    return {
      topic: TOPICS[key].title,
      questions: TOPICS[key].faqs.map(item => item.question),
    };
  }

  if (!query.conversationId) {
    const { data, error } = await admin
      .from('ask_i2c_conversations')
      .select('id,title,page_path,updated_at,message_count')
      .eq('workspace_id', workspaceId)
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 30);
    if (error) throw error;
    const rows = data || [];
    return { conversations: rows.slice(0, 30), hasMore: rows.length > 30, nextOffset: offset + 30 };
  }

  const thread = await getThread(admin, workspaceId, ownerId, query.conversationId);
  if (!thread) throw fail(404, 'Conversation not found.');

  const { data, error } = await admin
    .from('ask_i2c_messages')
    .select('id,role,content,created_at')
    .eq('conversation_id', thread.id)
    .eq('workspace_id', workspaceId)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + 50);
  if (error) throw error;
  const rows = data || [];

  return {
    conversationId: thread.id,
    title: thread.title,
    messageCount: thread.message_count,
    messages: rows.slice(0, 50).reverse(),
    hasMore: rows.length > 50,
    nextOffset: offset + 50,
  };
}

export async function generateI2cAnswer(context, history, message, fetcher = fetch) {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  if (!key) throw fail(503, 'Ask i2C is not configured yet. Add OPENAI_API_KEY to the server environment.');

  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const request = {
    store: false,
    model,
    instructions: instructions(),
    reasoning: { effort: 'low' },
    input: [
      ...boundedI2cHistory(history),
      {
        role: 'user',
        content: JSON.stringify({
          context,
          question: message,
        }),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'i2c_answer',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            in_scope: { type: 'boolean' },
            answer: { type: 'string' },
          },
          required: ['in_scope', 'answer'],
          additionalProperties: false,
        },
      },
    },
  };

  const signal = AbortSignal.timeout(45000);
  let result;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response;
    try {
      response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({ ...request, max_output_tokens: attempt ? 6000 : 3000 }),
      });
    } catch {
      throw fail(502, 'Ask i2C could not finish responding. Please retry.');
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw fail(502, 'Ask i2C could not respond. Please retry.');

    if (payload?.status === 'incomplete') {
      if (attempt === 0 && payload?.incomplete_details?.reason === 'max_output_tokens') continue;
      throw fail(502, 'Ask i2C could not finish responding. Please retry with a more specific question.');
    }

    if (payload?.status && payload.status !== 'completed') {
      throw fail(502, 'Ask i2C could not respond. Please retry.');
    }

    const parts = (payload?.output || []).flatMap(item => item.content || []);
    if (parts.some(part => part.type === 'refusal')) return REFUSAL;

    const outputText = parts
      .filter(part => part.type === 'output_text')
      .map(part => part.text)
      .join('');

    try { result = JSON.parse(outputText); }
    catch { throw fail(502, 'Ask i2C returned an incomplete answer. Please retry.'); }

    break;
  }

  if (result?.in_scope === false) return REFUSAL;
  if (result?.in_scope !== true || typeof result.answer !== 'string' || !result.answer.trim() || result.answer.length > 12000) {
    throw fail(502, 'Ask i2C returned an invalid answer.');
  }

  return result.answer.trim();
}

export async function sendI2cChat(admin, workspaceId, ownerId, input, { context, answer = generateI2cAnswer } = {}) {
  const message = String(input?.message || '').trim();
  if (!message || message.length > 4000) throw fail(422, 'Enter a question up to 4,000 characters.');

  const conversationId = input?.conversationId;
  const requestId = input?.requestId;
  if (!uuid(conversationId) || !uuid(requestId)) throw fail(422, 'Refresh the page to start a new chat.');

  const thread = await getThread(admin, workspaceId, ownerId, conversationId);
  const expected = Number(input?.messageCount);

  if (thread) {
    const { data: previous, error: previousError } = await admin
      .from('ask_i2c_messages')
      .select('role,content')
      .eq('conversation_id', conversationId)
      .eq('request_id', requestId)
      .eq('workspace_id', workspaceId)
      .eq('owner_id', ownerId);
    if (previousError) throw previousError;

    const saved = (previous || []).find(row => row.role === 'assistant');
    if (saved) {
      const previousUser = (previous || []).find(row => row.role === 'user');
      if (previousUser?.content !== message) throw fail(409, 'Start a new request for a different question.');
      return { conversationId, answer: saved.content, messageCount: thread.message_count };
    }
  }

  if (!Number.isInteger(expected) || expected < 0 || expected !== (thread?.message_count || 0)) {
    throw fail(409, 'This chat changed. Open it from History before sending again.');
  }

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await admin
    .from('ask_i2c_messages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('owner_id', ownerId)
    .eq('role', 'user')
    .gte('created_at', since)
    .limit(20);
  if (recentError) throw recentError;
  if ((recent || []).length >= 20) throw fail(429, 'You have reached the short-term message limit. Try again in a few minutes.');

  const topicKey = pageTopic(input?.currentPath);
  const faq = TOPICS[topicKey].faqs.find(item => item.question === message);

  let response = isI2cGreeting(message)
    ? 'Hello! I’m Ask i2C. Ask me about your cash, receivables, payables, inventory, forecasts, alerts, rules, or integrations.'
    : faq?.answer;

  if (!response) {
    let history = [];
    if (thread) {
      const { data, error } = await admin
        .from('ask_i2c_messages')
        .select('role,content,created_at')
        .eq('conversation_id', conversationId)
        .eq('workspace_id', workspaceId)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      history = data || [];
    }
    response = await answer(context, history, message);
  }

  const { data: saved, error: saveError } = await admin.rpc('i2c_ask_save_turn', {
    p_workspace_id: workspaceId,
    p_owner_id: ownerId,
    p_conversation_id: conversationId,
    p_request_id: requestId,
    p_page_path: `/${topicKey}/`,
    p_message: message,
    p_answer: response,
    p_expected_count: expected,
  });

  if (saveError) throw fail(409, 'Your answer could not be saved. Open History to check this conversation before retrying.');
  return saved;
}
