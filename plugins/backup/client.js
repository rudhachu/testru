// import { Boom } from '@hapi/boom';
// import NodeCache from 'node-cache';
// import readline from 'readline';
// import makeWASocket, { AnyMessageContent, BinaryInfo, delay, DisconnectReason, downloadAndProcessHistorySyncNotification, encodeWAM, fetchLatestBaileysVersion, getAggregateVotesInPollMessage, getHistoryMsg, isJidNewsletter, makeCacheableSignalKeyStore, makeInMemoryStore, PHONENUMBER_MCC, proto, useMultiFileAuthState } from '../src';
// import open from 'open';
// import fs from 'fs';
// import P from 'pino';

// const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'));
// logger.level = 'trace';

// const useStore = !process.argv.includes('--no-store');
// const doReplies = process.argv.includes('--do-reply');
// const usePairingCode = process.argv.includes('--use-pairing-code');
// const useMobile = process.argv.includes('--mobile');

// const msgRetryCounterCache = new NodeCache();
// const onDemandMap = new Map();

// const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// const store = useStore ? makeInMemoryStore({ logger }) : undefined;
// if (store) store.readFromFile('./baileys_store_multi.json');

// setInterval(() => {
// 	if (store) store.writeToFile('./baileys_store_multi.json');
// }, 10000);

// // start a connection
// const startSock = async () => {
// 	const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
// 	const { version, isLatest } = await fetchLatestBaileysVersion();
// 	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

// 	const sock = makeWASocket({
// 		version,
// 		logger,
// 		printQRInTerminal: !usePairingCode,
// 		mobile: useMobile,
// 		auth: {
// 			creds: state.creds,
// 			keys: makeCacheableSignalKeyStore(state.keys, logger),
// 		},
// 		msgRetryCounterCache,
// 		generateHighQualityLinkPreview: true,
// 		getMessage,
// 	});

// 	if (store) store.bind(sock.ev);

// 	// Pairing code for Web clients
// 	if (usePairingCode && !sock.authState.creds.registered) {
// 		if (useMobile) {
// 			throw new Error('Cannot use pairing code with mobile api');
// 		}

// 		const phoneNumber = await question('Please enter your mobile phone number:\n');
// 		const code = await sock.requestPairingCode(phoneNumber);
// 		console.log(`Pairing code: ${code}`);
// 	}

// 	// If mobile was chosen, ask for the code
// 	if (useMobile && !sock.authState.creds.registered) {
// 		const { registration } = sock.authState.creds || { registration: {} };

// 		if (!registration.phoneNumber) {
// 			registration.phoneNumber = await question('Please enter your mobile phone number:\n');
// 		}

// 		const libPhonenumber = await import('libphonenumber-js');
// 		const phoneNumber = libPhonenumber.parsePhoneNumber(registration.phoneNumber);
// 		if (!phoneNumber?.isValid()) {
// 			throw new Error('Invalid phone number: ' + registration.phoneNumber);
// 		}

// 		registration.phoneNumber = phoneNumber.format('E.164');
// 		registration.phoneNumberCountryCode = phoneNumber.countryCallingCode;
// 		registration.phoneNumberNationalNumber = phoneNumber.nationalNumber;
// 		const mcc = PHONENUMBER_MCC[phoneNumber.countryCallingCode];
// 		if (!mcc) {
// 			throw new Error('Could not find MCC for phone number: ' + registration.phoneNumber + '\nPlease specify the MCC manually.');
// 		}

// 		registration.phoneNumberMobileCountryCode = mcc;

// 		const enterCode = async () => {
// 			try {
// 				const code = await question('Please enter the one time code:\n');
// 				const response = await sock.register(code.replace(/["']/g, '').trim().toLowerCase());
// 				console.log('Successfully registered your phone number.');
// 				console.log(response);
// 				rl.close();
// 			} catch (error) {
// 				console.error('Failed to register your phone number. Please try again.\n', error);
// 				await askForOTP();
// 			}
// 		};

// 		const enterCaptcha = async () => {
// 			const response = await sock.requestRegistrationCode({ ...registration, method: 'captcha' });
// 			const path = __dirname + '/captcha.png';
// 			fs.writeFileSync(path, Buffer.from(response.image_blob, 'base64'));

// 			open(path);
// 			const code = await question('Please enter the captcha code:\n');
// 			fs.unlinkSync(path);
// 			registration.captcha = code.replace(/["']/g, '').trim().toLowerCase();
// 		};

// 		const askForOTP = async () => {
// 			if (!registration.method) {
// 				await delay(2000);
// 				let code = await question('How would you like to receive the one time code for registration? "sms" or "voice"\n');
// 				code = code.replace(/["']/g, '').trim().toLowerCase();
// 				if (code !== 'sms' && code !== 'voice') {
// 					return await askForOTP();
// 				}

// 				registration.method = code;
// 			}

// 			try {
// 				await sock.requestRegistrationCode(registration);
// 				await enterCode();
// 			} catch (error) {
// 				console.error('Failed to request registration code. Please try again.\n', error);

// 				if (error?.reason === 'code_checkpoint') {
// 					await enterCaptcha();
// 				}

// 				await askForOTP();
// 			}
// 		};

// 		askForOTP();
// 	}

// 	const sendMessageWTyping = async (msg, jid) => {
// 		await sock.presenceSubscribe(jid);
// 		await delay(500);

// 		await sock.sendPresenceUpdate('composing', jid);
// 		await delay(2000);

// 		await sock.sendPresenceUpdate('paused', jid);

// 		await sock.sendMessage(jid, msg);
// 	};

// 	sock.ev.process(async (events) => {
// 		if (events['connection.update']) {
// 			const update = events['connection.update'];
// 			const { connection, lastDisconnect } = update;
// 			if (connection === 'close') {
// 				if ((lastDisconnect?.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
// 					startSock();
// 				} else {
// 					console.log('Connection closed. You are logged out.');
// 				}
// 			}

// 			console.log('connection update', update);
// 		}

// 		if (events['creds.update']) {
// 			await saveCreds();
// 		}

// 		if (events.call) {
// 			console.log('recv call event', events.call);
// 		}

// 		if (events['messages.upsert']) {
// 			const upsert = events['messages.upsert'];
// 			console.log('recv messages ', JSON.stringify(upsert, undefined, 2));

// 			if (upsert.type === 'notify') {
// 				for (const msg of upsert.messages) {
// 					if (!msg.key.fromMe && doReplies && !isJidNewsletter(msg.key?.remoteJid)) {
// 						console.log('replying to', msg.key.remoteJid);
// 						await sock.readMessages([msg.key]);
// 						await sendMessageWTyping({ text: 'Hello there!' }, msg.key.remoteJid);
// 					}
// 				}
// 			}
// 		}
// 	});

// 	return sock;

// 	async function getMessage(key) {
// 		if (store) {
// 			const msg = await store.loadMessage(key.remoteJid, key.id);
// 			return msg?.message;
// 		}
// 		return proto.Message.fromObject({});
// 	}
// };

// startSock();
