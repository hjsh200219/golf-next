/**
 * 텔레그램 봇 슬래시 커맨드 자동완성 등록 스크립트 (setMyCommands).
 *
 * 실행하면 텔레그램 클라이언트의 입력창에서 "/" 입력 시 명령어 목록이
 * 자동완성으로 노출된다. 봇 메뉴 버튼에도 동일 목록이 표시된다.
 * 명령어 추가/문구 변경 시 재실행하면 됨 (멱등).
 *
 * 사용:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_JK_BOT_TOKEN=... \
 *   npx tsx scripts/set-telegram-commands.ts
 *
 * 환경변수:
 *   TELEGRAM_BOT_TOKEN     메인 봇 토큰 (전 골프장 빈자리 알림)
 *   TELEGRAM_JK_BOT_TOKEN  양주 봇 토큰 (@jonnyjhkimbot, 알림 + 실예약)
 *   둘 중 설정된 봇만 등록한다.
 */

type BotCommand = { command: string; description: string };

// 메인 봇: 전 골프장 빈자리 알림 (watch-only)
const MAIN_COMMANDS: BotCommand[] = [
  { command: 'watch', description: '빈자리 알림 등록 (골프장 → 날짜 → 시간대)' },
  { command: 'list', description: '등록한 알림 목록 보기 / 삭제' },
  { command: 'stop', description: '알림 삭제하기' },
  { command: 'cancel', description: '진행 중인 알림 설정 취소' },
  { command: 'help', description: '도움말 보기' },
];

// 양주 봇: 양주CC 전용 — 알림 + 실예약
const YANGJU_COMMANDS: BotCommand[] = [
  { command: 'book', description: '지금 빈자리 조회 후 바로 예약' },
  { command: 'watch', description: '빈자리 알림 등록 (날짜 → 시간대)' },
  { command: 'list', description: '등록한 알림 보기 / 삭제' },
  { command: 'stop', description: '알림 삭제' },
  { command: 'cancel', description: '진행 중 설정 취소' },
  { command: 'help', description: '도움말' },
];

async function setCommands(label: string, token: string, commands: BotCommand[]) {
  const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // scope 생략 = default(전체 채팅). language_code 생략 = 모든 언어 기본값.
    body: JSON.stringify({ commands }),
  });

  const body = (await res.json()) as { ok: boolean; description?: string };

  if (!res.ok || !body.ok) {
    console.error(`[${label}] setMyCommands failed:`, body.description ?? res.statusText);
    process.exitCode = 1;
    return;
  }

  console.log(`[${label}] commands set (${commands.length}): ${commands.map((c) => '/' + c.command).join(' ')}`);
}

async function main() {
  const mainToken = process.env.TELEGRAM_BOT_TOKEN;
  const jkToken = process.env.TELEGRAM_JK_BOT_TOKEN;

  if (!mainToken && !jkToken) {
    console.error('Missing env. Set at least one of: TELEGRAM_BOT_TOKEN, TELEGRAM_JK_BOT_TOKEN');
    process.exit(1);
  }

  if (mainToken) await setCommands('main', mainToken, MAIN_COMMANDS);
  if (jkToken) await setCommands('yangju', jkToken, YANGJU_COMMANDS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
