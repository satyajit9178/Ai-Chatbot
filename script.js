// ---------------- DOM ELEMENTS ----------------

const chatBody = document.querySelector('.chat-body');
const messageInput = document.querySelector('.message-input');
const sendMessageButton = document.querySelector('#send-message');
const fileInput = document.querySelector('#file-input');
const fileUploadWrapper = document.querySelector('.file-upload-wrapper');
const fileCancelButton = document.querySelector('#file-cancel');
const chatbotToggler = document.querySelector('#chatbot-toggler');
const closeChatbot = document.querySelector('#close-chatbot');


// ---------------- API SETUP (GROQ) ----------------

// ⚠️ Demo use only — key exposed in frontend
const API_KEY = "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";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";


// ---------------- AI SETTINGS ----------------

// Strong prompt to reduce hallucinations
const SYSTEM_PROMPT = `
You are an intelligent AI assistant.

Rules:
- Be accurate, clear, and helpful
- If unsure or outdated, say you don't know
- Do NOT invent facts
- Prefer concise answers
- Maintain conversation context
- If asked about current events, mention possible outdated knowledge
`;


// ---------------- USER DATA ----------------

const userData = {
  message: null,
  file: { data: null, mime_type: null }
};

const chatHistory = [];
const MAX_HISTORY = 20;

const initialInputHeight = messageInput.scrollHeight;


// ---------------- UTIL FUNCTIONS ----------------

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

function buildContext() {
  const now = new Date().toLocaleString();
  return `Current date and time: ${now}`;
}


// ---------------- BOT RESPONSE ----------------

const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement =
    incomingMessageDiv.querySelector(".message-text");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: buildContext() },
          ...chatHistory,
          { role: "user", content: userData.message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok)
      throw new Error(data.error?.message || "API error");

    const botText = data.choices[0].message.content;

    messageElement.innerText = botText;

    // Save conversation
    chatHistory.push({ role: "user", content: userData.message });
    chatHistory.push({ role: "assistant", content: botText });

    // Limit history
    if (chatHistory.length > MAX_HISTORY)
      chatHistory.splice(0, 2);

  } catch (error) {
    console.error(error);
    messageElement.innerText =
      "⚠️ Unable to connect. Please try again.";
    messageElement.style.color = "#ff0000";
  } finally {
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: "smooth"
    });
  }
};


// ---------------- SEND MESSAGE ----------------

const handleOutgoingMessage = (e) => {
  e.preventDefault();

  userData.message = messageInput.value.trim();
  if (!userData.message && !userData.file.data) return;

  messageInput.value = "";
  fileUploadWrapper.classList.remove("file-uploaded");

  messageInput.dispatchEvent(new Event("input"));

  const messageContent = `
    <div class="message-text"></div>
    ${
      userData.file.data
        ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="file-preview" />`
        : ""
    }
  `;

  const outgoingMessageDiv = createMessageElement(
    messageContent,
    "user-message"
  );

  outgoingMessageDiv.querySelector(".message-text").innerText =
    userData.message;

  chatBody.appendChild(outgoingMessageDiv);

  chatBody.scrollTo({
    top: chatBody.scrollHeight,
    behavior: "smooth"
  });

  // Bot typing indicator
  setTimeout(() => {
    const botContent = `
      <div class="message-text">
        <div class="thinking-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    `;

    const incomingMessageDiv = createMessageElement(
      botContent,
      "bot-message",
      "thinking"
    );

    chatBody.appendChild(incomingMessageDiv);

    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: "smooth"
    });

    generateBotResponse(incomingMessageDiv);

  }, 500);
};


// ---------------- INPUT EVENTS ----------------

messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();

  if (
    e.key === "Enter" &&
    userMessage &&
    !e.shiftKey &&
    window.innerWidth > 768
  ) {
    handleOutgoingMessage(e);
  }
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;

  document.querySelector(".chat-form").style.borderRadius =
    messageInput.scrollHeight > initialInputHeight
      ? "15px"
      : "32px";
});

sendMessageButton.addEventListener(
  "click",
  handleOutgoingMessage
);


// ---------------- FILE UPLOAD ----------------

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    fileUploadWrapper.querySelector("img").src =
      e.target.result;

    fileUploadWrapper.classList.add("file-uploaded");

    const base64 = e.target.result.split(",")[1];

    userData.file = {
      data: base64,
      mime_type: file.type
    };

    fileInput.value = "";
  };

  reader.readAsDataURL(file);
});

fileCancelButton.addEventListener("click", () => {
  userData.file = { data: null, mime_type: null };
  fileUploadWrapper.classList.remove("file-uploaded");
});

document
  .querySelector("#file-upload")
  .addEventListener("click", () => fileInput.click());


// ---------------- CHAT TOGGLE ----------------

chatbotToggler.addEventListener("click", () => {
  document.body.classList.toggle("show-chatbot");
});

closeChatbot.addEventListener("click", () => {
  document.body.classList.remove("show-chatbot");
});
