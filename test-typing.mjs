
import { Zalo, ThreadType } from "zca-js";

const GROUP_ID = "8460607448448318048";

const zalo = new Zalo();

console.log("Dang dang nhap Zalo...");
const api = await zalo.loginQR();

console.log("Dang nhap thanh cong.");
console.log("Chuan bi gui typing event sau 5 giay...");

await new Promise(resolve => setTimeout(resolve, 5000));

try {
  const result = await api.sendTypingEvent(
    GROUP_ID,
    ThreadType.Group
  );

  console.log("[TYPING SENT]", result);
} catch (error) {
  console.error("[TYPING ERROR]", error.message);
}

console.log("Ket thuc kiem tra.");
