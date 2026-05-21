const Matter = require('matter-js');
const { Engine, World, Bodies, Runner } = Matter;
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } = require('electron');
const { Worker } = require('worker_threads');
const configPath = path.join(__dirname, 'hw_config.json');
let useGPU = true;
try {
    if (fs.existsSync(configPath)) {
        useGPU = JSON.parse(fs.readFileSync(configPath)).useGPU !== false; 
    }
} catch (e) {}
if (!useGPU) app.disableHardwareAcceleration();

let tray = null;
let win;
let sovitsProcess = null;
let radarProcess = null;
const voiceConfigs = {
    "anon": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_千早爱音_v2pp.pth",
        ckpt: "GPT_weights_v2ProPlus/MyGO_千早爱音_v2pp.ckpt",
        refAudio: "output/anon/カフェで撮った写真……リアクションたったこれだけ～！？しっかり映えてるし、もっと反応もらえると思ったんだけどな～.mp3",
        refText: "カフェで撮った写真……リアクションたったこれだけ～！？しっかり映えてるし、もっと反応もらえると思ったんだけどな～"
    },
    "tomorin": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_高松灯_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_高松灯_v2pp.ckpt",   
        refAudio: "output/tomorin/優しいそよちゃん、怒ってるそよちゃん、ババ抜きが上手なそよちゃん、苦手なことがあるそよちゃん……いろんなところがあるから、人間だなって.mp3",               
        refText: "優しいそよちゃん、怒ってるそよちゃん、ババ抜きが上手なそよちゃん、苦手なことがあるそよちゃん……いろんなところがあるから、人間だなって"                         
    },
    "taki": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_椎名立希_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_椎名立希_v2pp.ckpt",   
        refAudio: "output/taki/そういう時、ちゃんと気を付けて対応しないと……なんていうか、お店の雰囲気を壊しちゃう気がして…….mp3",               
        refText: "そういう時、ちゃんと気を付けて対応しないと……なんていうか、お店の雰囲気を壊しちゃう気がして……"
    },
    "soyo": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_长崎素世_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_长崎素世_v2pp.ckpt",   
        refAudio: "output/soyo/運命だなんて言われたのは、生まれて初めてで……なんだかちょっと、くすぐったくて。あたたかい心地がした.mp3",               
        refText: "運命だなんて言われたのは、生まれて初めてで……なんだかちょっと、くすぐったくて。あたたかい心地がした"
    },
    "rana": {
        pth: "SoVITS_weights_v2ProPlus/MyGO_要乐奈_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/MyGO_要乐奈_v2pp.ckpt",   
        refAudio: "output/rana/抹茶生地に抹茶クリームと抹茶アイスと抹茶チョコ。仕上げにたっぷり抹茶ソース。.mp3",               
        refText: "抹茶生地に抹茶クリームと抹茶アイスと抹茶チョコ。仕上げにたっぷり抹茶ソース。"
    },
    "sakiko": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_豊川祥子_白_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_豊川祥子_白_v2pp.ckpt",   
        refAudio: "output/sakiko/(A)あなたと空を見上げるのは、いつも夏でしたわね.wav",               
        refText: "あなたと空を見上げるのは、いつも夏でしたわね"
    },
    "mutsumi": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_若葉睦_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_若葉睦_v2pp.ckpt",   
        refAudio: "output/mutsumi/ごめんなさい。バンド壊して、ギター下手で、ずっと謝りたかった.wav",               
        refText: "ごめんなさい。バンド壊して、ギター下手で、ずっと謝りたかった"
    },
    "umiri": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_八幡海鈴_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_八幡海鈴_v2pp.ckpt",   
        refAudio: "output/umiri/(A)世界観という意味では、若葉さんが独自のアプローチでの表現に、成功しているのではないでしょうか.wav",               
        refText: "世界観という意味では、若葉さんが独自のアプローチでの表現に、成功しているのではないでしょうか"
    },
    "uika": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_三角初華_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_三角初華_v2pp.ckpt",   
        refAudio: "output/uika/(A)ういかは、ひとりで食べるには少し多めのお菓子をつかんで.wav",               
        refText: "ういかは、ひとりで食べるには少し多めのお菓子をつかんで"
    },
    "nyamu": {
        pth: "SoVITS_weights_v2ProPlus/Mujica_祐天寺若麥_乖猫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Mujica_祐天寺若麥_乖猫_v2pp.ckpt",   
        refAudio: "output/nyamu/(A)仕切るわりには、責任はサキコに取らすようなしゃべり方しかしてなかったもんねー.wav",               
        refText: "仕切るわりには、責任はサキコに取らすようなしゃべり方しかしてなかったもんねー"
    },
    "yukina": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_湊友希那_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_湊友希那_v2pp.ckpt",   
        refAudio: "output/yukina/この前、修学旅行に行ってきたのだけれど。練習の合間に、撮った写真を整理しようかと思って.mp3",               
        refText: "この前、修学旅行に行ってきたのだけれど。練習の合間に、撮った写真を整理しようかと思って"
    },
    "mana": {
        pth: "SoVITS_weights_v2ProPlus/純田真奈_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/純田真奈_v2pp.ckpt",   
        refAudio: "output/mana/現場の雰囲気もいいし、優しくて頼れるお姉さんって感じでね。今日も仕事終わりにご飯行く約束してるんだ.wav",               
        refText: "現場の雰囲気もいいし、優しくて頼れるお姉さんって感じでね。今日も仕事終わりにご飯行く約束してるんだ"
    },
    "kasumi": {
        pth: "SoVITS_weights_v2ProPlus/ppp_戸山香澄_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_戸山香澄_v2pp.ckpt",   
        refAudio: "output/kasumi/(ZH)ほら、修学旅行でやったりしなかった？布団にもぐって、これまでずっと秘密にしてたこと、みんなで言い合うの！.mp3",               
        refText: "ほら、修学旅行でやったりしなかった？布団にもぐって、これまでずっと秘密にしてたこと、みんなで言い合うの！"
    },
    "arisa": {
        pth: "SoVITS_weights_v2ProPlus/ppp_市ヶ谷有咲_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_市ヶ谷有咲_v2pp.ckpt",   
        refAudio: "output/arisa/(A1)まあ、私はどうでもいいけど……新しいメンバーが入るなら、知らない人より山吹さんのほうが私は楽かな.mp3",               
        refText: "(A1)まあ、私はどうでもいいけど……新しいメンバーが入るなら、知らない人より山吹さんのほうが私は楽かな"
    },
    "rimi": {
        pth: "SoVITS_weights_v2ProPlus/ppp_牛込里美_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_牛込里美_v2pp.ckpt",   
        refAudio: "output/rimi/でもね、それでも じっとしてたくなかったから.mp3",               
        refText: "でもね、それでも じっとしてたくなかったから"
    },
    "tae": {
        pth: "SoVITS_weights_v2ProPlus/ppp_花園多惠_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_花園多惠_v2pp.ckpt",   
        refAudio: "output/tae/あ、イヴにはまだ話してなかったっけ？今有咲、助っ人で楽器店の短期バイトしてくれてるんだ.mp3",               
        refText: "あ、イヴにはまだ話してなかったっけ？今有咲、助っ人で楽器店の短期バイトしてくれてるんだ"
    },
    "saaya": {
        pth: "SoVITS_weights_v2ProPlus/ppp_山吹沙绫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/ppp_山吹沙绫_v2pp.ckpt",   
        refAudio: "output/saaya/そういうワクワクを、素直に追いかけられるようになったのも……ポピパに、香澄に出会えたからだよ.mp3",               
        refText: "そういうワクワクを、素直に追いかけられるようになったのも……ポピパに、香澄に出会えたからだよ"
    },
    "aya": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_丸山彩_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_丸山彩_v2pp.ckpt",   
        refAudio: "output/aya/私だけが頑張ったわけじゃないよ。花音ちゃんや紗夜ちゃん、他にもいろんな人が力を合わせて、できあがったしおりだから.mp3",               
        refText: "私だけが頑張ったわけじゃないよ。花音ちゃんや紗夜ちゃん、他にもいろんな人が力を合わせて、できあがったしおりだから"
    },
    "eve": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_若宮伊芙_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_若宮伊芙_v2pp.ckpt",   
        refAudio: "output/eve/あけましておめでとうございますっ！視聴者のみなさん、私たちが今どこにいるかわかりますか？.mp3",               
        refText: "あけましておめでとうございますっ！視聴者のみなさん、私たちが今どこにいるかわかりますか？"
    },
    "maya": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_大和麻弥_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_大和麻弥_v2pp.ckpt",   
        refAudio: "output/maya/あの日のライブはたった１曲だけでしたが、そこにぎっしりと詰まっている、ドラマや想いを実感できて嬉しかったというか.mp3",               
        refText: "あの日のライブはたった１曲だけでしたが、そこにぎっしりと詰まっている、ドラマや想いを実感できて嬉しかったというか"
    },
    "hina": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_冰川日菜_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_冰川日菜_v2pp.ckpt",   
        refAudio: "output/hina/ふんふふふーん、今日は何して過ごそうかなー。ポテト食べに行こうかな？彩ちゃんバイトしてるかなー？.mp3",               
        refText: "ふんふふふーん、今日は何して過ごそうかなー。ポテト食べに行こうかな？彩ちゃんバイトしてるかなー？"
    },
    "chisato": {
        pth: "SoVITS_weights_v2ProPlus/パスパレ_白鷺千聖_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/パスパレ_白鷺千聖_v2pp.ckpt",   
        refAudio: "output/chisato/それじゃあ、仕事に使った荷物もあることだし、各自準備ができたら、ショッピングモールに集まりましょう.mp3",               
        refText: "それじゃあ、仕事に使った荷物もあることだし、各自準備ができたら、ショッピングモールに集まりましょう"
    },
    "ako": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_宇田川亚子_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_宇田川亚子_v2pp.ckpt",   
        refAudio: "output/ako/あこが友達紹介キャンペーンの特典をもらうために一緒にやってもらったんだけどね.mp3",               
        refText: "あこが友達紹介キャンペーンの特典をもらうために一緒にやってもらったんだけどね"
    },
    "sayo": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_冰川纱夜_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_冰川纱夜_v2pp.ckpt",   
        refAudio: "output/sayo/日常の中にある、些細な出来事を美しく描いていて、素敵ですね.mp3",               
        refText: "日常の中にある、些細な出来事を美しく描いていて、素敵ですね"
    },
    "rinko": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_白金燐子_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_白金燐子_v2pp.ckpt",   
        refAudio: "output/rinko/あこちゃんがいてくれるから、自然に話せるんですけど、二人きりだとちょっと違いますね.mp3",               
        refText: "あこちゃんがいてくれるから、自然に話せるんですけど、二人きりだとちょっと違いますね"
    },
    "lisa": {
        pth: "SoVITS_weights_v2ProPlus/Roselia_今井莉莎_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Roselia_今井莉莎_v2pp.ckpt",   
        refAudio: "output/lisa/アタシもピンうさのファン第一号として応援してるよ。じゃ、アタシ自主練あるからこれで.mp3",               
        refText: "アタシもピンうさのファン第一号として応援してるよ。じゃ、アタシ自主練あるからこれで"
    },
    "kokoro": {
        pth: "SoVITS_weights_v2ProPlus/HHW_弦卷心_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_弦卷心_v2pp.ckpt",   
        refAudio: "output/kokoro/あこに教えてもらったの！こうしてパレードしながら宣伝すれば、もっとたくさんの人にサーカスのことを知ってもらえるでしょう？.mp3",               
        refText: "あこに教えてもらったの！こうしてパレードしながら宣伝すれば、もっとたくさんの人にサーカスのことを知ってもらえるでしょう？"
    },
    "hagumi": {
        pth: "SoVITS_weights_v2ProPlus/HHW_北泽育美_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_北泽育美_v2pp.ckpt",   
        refAudio: "output/hagumi/あっ！はぐみ、うっかりしてた！ごめんねりみりん……でも、まだまだ食べられるから心配しないで！.mp3",               
        refText: "あっ！はぐみ、うっかりしてた！ごめんねりみりん……でも、まだまだ食べられるから心配しないで！"
    },
    "kaoru": {
        pth: "SoVITS_weights_v2ProPlus/HHW_濑田薰_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_濑田薰_v2pp.ckpt",   
        refAudio: "output/kaoru/ありがとう、美咲。心配には及ばないよ。今日はハロハピの活動のために予定を空けているからね.mp3",               
        refText: "ありがとう、美咲。心配には及ばないよ。今日はハロハピの活動のために予定を空けているからね"
    },
    "kanon": {
        pth: "SoVITS_weights_v2ProPlus/HHW_松原花音_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_松原花音_v2pp.ckpt",   
        refAudio: "output/kanon/あとでみんなで会いにいこっか。定期的にお散歩もしているみたいだから、時間は確認しないといけないけど.mp3",               
        refText: "あとでみんなで会いにいこっか。定期的にお散歩もしているみたいだから、時間は確認しないといけないけど"
    },
    "misaki": {
        pth: "SoVITS_weights_v2ProPlus/HHW_奥泽美咲_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/HHW_奥泽美咲_v2pp.ckpt",   
        refAudio: "output/misaki/この前借りたノート、まだ返してなかったから。そろそろ期末テストも近づいてきたし。はいこれ、ありがと.mp3",               
        refText: "この前借りたノート、まだ返してなかったから。そろそろ期末テストも近づいてきたし。はいこれ、ありがと"
    },
    "ran": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_美竹蘭_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_美竹蘭_v2pp.ckpt",   
        refAudio: "output/ran/(A)モカの気持ちが伝わってくるっていうか、あたし達のことをどう思ってるのかとか、音を通じて感じられるような気がして.mp3",               
        refText: "モカの気持ちが伝わってくるっていうか、あたし達のことをどう思ってるのかとか、音を通じて感じられるような気がして"
    },
    "moca": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_青葉モカ_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_青葉モカ_v2pp.ckpt",   
        refAudio: "output/moca/(B)ごはんの最中にスマホはダメってあれだけ言ったでしょ～。そんな子に育てた覚えはありません～.mp3",               
        refText: "ごはんの最中にスマホはダメってあれだけ言ったでしょ～。そんな子に育てた覚えはありません～"
    },
    "himari": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_上原ひまり_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_上原ひまり_v2pp.ckpt",   
        refAudio: "output/himari/(？)ら、蘭！？変なモノを見るような目で見たまま、行かないで～っ！お願いだから、話を聞いて～っ！！.mp3",               
        refText: "ら、蘭！？変なモノを見るような目で見たまま、行かないで～っ！お願いだから、話を聞いて～っ！！"
    },
    "tomoe": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_宇田川巴_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_宇田川巴_v2pp.ckpt",   
        refAudio: "output/tomoe/いやー、楽しかった！なんかだんだん、喋るのに抵抗なくなっていってさ、どんどん話ふくらませちゃったよな！.mp3",               
        refText: "いやー、楽しかった！なんかだんだん、喋るのに抵抗なくなっていってさ、どんどん話ふくらませちゃったよな！"
    },
    "tsugumi": {
        pth: "SoVITS_weights_v2ProPlus/Afterglow_羽沢鶫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/Afterglow_羽沢鶫_v2pp.ckpt",   
        refAudio: "output/tsugumi/いえいえ、そんなことないです！昔の私だったら、緊張しちゃってよくない空気に飲まれちゃってたかもしれないです.mp3",               
        refText: "いえいえ、そんなことないです！昔の私だったら、緊張しちゃってよくない空気に飲まれちゃってたかもしれないです"
    },
    "rei": {
        pth: "SoVITS_weights_v2ProPlus/RAS_LAYER_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_LAYER_v2pp.ckpt",   
        refAudio: "output/rei/じゃあ、早速だけど行こうか。パレオ、好きなショップで新作が出たって言ってたし、そこから行く？.mp3",               
        refText: "じゃあ、早速だけど行こうか。パレオ、好きなショップで新作が出たって言ってたし、そこから行く？"
    },
    "pareo": {
        pth: "SoVITS_weights_v2ProPlus/RAS_PAREO_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_PAREO_v2pp.ckpt",   
        refAudio: "output/pareo/(A)パレオの仕事は、チュチュ様ならびにラスのみなさんが音楽活動に集中できるようパーフェクトな環境をご用意することですっ.mp3",               
        refText: "パレオの仕事は、チュチュ様ならびにラスのみなさんが音楽活動に集中できるようパーフェクトな環境をご用意することですっ"
    },
    "lock": {
        pth: "SoVITS_weights_v2ProPlus/RAS_LOCK_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_LOCK_v2pp.ckpt",   
        refAudio: "output/lock/ご、誤解ですっ！そういう話もミラドリの皆さんのなかでは一瞬あったみたいですけど、実際引き抜きを持ちかけられたとかではないですっ！.mp3",               
        refText: "ご、誤解ですっ！そういう話もミラドリの皆さんのなかでは一瞬あったみたいですけど、実際引き抜きを持ちかけられたとかではないですっ！"
    },
    "masuki": {
        pth: "SoVITS_weights_v2ProPlus/RAS_MASKING_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_MASKING_v2pp.ckpt",   
        refAudio: "output/masuki/あの頃の自分たちだったら、イルミネーションを見ても、こんな楽しい気持ちにならなかっただろうなって……そんな話をみんなとしてました.mp3",               
        refText: "あの頃の自分たちだったら、イルミネーションを見ても、こんな楽しい気持ちにならなかっただろうなって……そんな話をみんなとしてました"
    },
    "chu2": {
        pth: "SoVITS_weights_v2ProPlus/RAS_Chu²_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/RAS_Chu²_v2pp.ckpt",   
        refAudio: "output/chu2/(A)ミラドリも、かつては熱い志を持ったバンドだったみたいね。強い想いがなければ、プロになんてなれないわ.mp3",               
        refText: "ミラドリも、かつては熱い志を持ったバンドだったみたいね。強い想いがなければ、プロになんてなれないわ"
    },
    "mashiro": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_倉田真白_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_倉田真白_v2pp.ckpt",   
        refAudio: "output/mashiro/なんだか、のど自慢大会のステージは、普段のライブで歌う時と会場の雰囲気が全然違ったっていうか…….mp3",               
        refText: "なんだか、のど自慢大会のステージは、普段のライブで歌う時と会場の雰囲気が全然違ったっていうか……"
    },
    "nanami": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_廣町七深_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_廣町七深_v2pp.ckpt",   
        refAudio: "output/nanami/広町の目はごまかせないよ～？演奏が終わったあとつーちゃんがガッツポーズしてたのバッチリ見てたからね～.mp3",               
        refText: "広町の目はごまかせないよ～？演奏が終わったあとつーちゃんがガッツポーズしてたのバッチリ見てたからね～"
    },
    "touko": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_桐谷透子_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_桐谷透子_v2pp.ckpt",   
        refAudio: "output/touko/あとはモニカのみんなは確定だし、紗夜さんに、おたえさん、それから美咲さんと薫さんにも頼みたいんだよねー.mp3",               
        refText: "あとはモニカのみんなは確定だし、紗夜さんに、おたえさん、それから美咲さんと薫さんにも頼みたいんだよねー"
    },
    "rui": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_八潮瑠唯_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_八潮瑠唯_v2pp.ckpt",   
        refAudio: "output/rui/(A)あなたの、その想像力よ。水面が輝いてるところを見て、そこまで想像を広げられるなんて、なかなかできないわ.mp3",               
        refText: "あなたの、その想像力よ。水面が輝いてるところを見て、そこまで想像を広げられるなんて、なかなかできないわ"
    },
    "tsukushi": {
        pth: "SoVITS_weights_v2ProPlus/モニカ_二葉筑紫_v2pp.pth",  
        ckpt: "GPT_weights_v2ProPlus/モニカ_二葉筑紫_v2pp.ckpt",   
        refAudio: "output/tsukushi/ええと、西の広場のゴブリンさんにポポクテ草を届けて、迷子のゴブリンさんを探して、そのあとは～…….mp3",               
        refText: "ええと、西の広場のゴブリンさんにポポクテ草を届けて、迷子のゴブリンさんを探して、そのあとは～……"
    },
};


function startSoVITS(charId) {
    const config = voiceConfigs[charId];
    if (!config) {
        console.log(`未找到 [${charId}] 的语音配置，无法启动对应声音！`);
        return;
    }

    const sovitsDir = path.join(__dirname, 'GPT-SoVITS'); 
    const pythonPath = path.join(sovitsDir, 'runtime', 'python.exe');
    
    const args = [
        'api.py',
        '-s', config.pth,
        '-g', config.ckpt,
        '-dr', config.refAudio,
        '-dt', config.refText,
        '-dl', 'ja' 
    ];
    
    try {
        console.log(`正在后台唤醒 [${charId}] 的专属语音引擎...`);
        sovitsProcess = spawn(pythonPath, args, {
            cwd: sovitsDir,     
            windowsHide: false   
        });
        sovitsProcess.stdout.on('data', (data) => console.log(`[SoVITS] ${data}`));
        sovitsProcess.stderr.on('data', (data) => console.log(`[SoVITS 状态] ${data}`));
    } catch (e) {
        console.error("唤醒语音引擎失败:", e);
    }
}

ipcMain.on('switch-character', (event, charId) => {
    console.log(`\n=== 收到切人指令: 准备切换到 ${charId} ===`);
    if (sovitsProcess) {
        console.log("正在关闭旧的语音引擎...");
        sovitsProcess.kill();
        sovitsProcess = null;
    }
    setTimeout(() => {
        startSoVITS(charId);
    }, 1000);
});

app.whenReady().then(() => {
    const radarPath = path.join(__dirname, 'emotion_radar.py');
    if (fs.existsSync(radarPath)) {
        console.log("后台静默启动...");
        radarProcess = spawn('python', [radarPath], {
            cwd: __dirname,
            windowsHide: true 
        });

        radarProcess.stdout.on('data', (data) => console.log(`[情绪雷达]: ${data.toString().trim()}`));
        radarProcess.stderr.on('data', (data) => console.error(`[报错]: ${data.toString().trim()}`));
    } else {
        console.log("未找到 emotion_radar.py");
    }
      win = new BrowserWindow({
      width: 3840,       
      height: 2160,      
      transparent: true, 
      frame: false,      
      hasShadow: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false
      }
    });
  
    win.loadFile(path.join(__dirname, 'index.html')); 
    win.on('closed', () => {
        if (typeof physicalItems !== 'undefined') {
            physicalItems.forEach(item => {
                if (item.window && !item.window.isDestroyed()) {
                    item.window.destroy();
                }
            });
            physicalItems = [];
        }
        app.quit(); 
    });
    win.once('ready-to-show', () => {
        win.maximize(); 
        win.show();
    });
try {
    const workerPath = path.join(__dirname, 'media_worker.js');
    const mediaWorker = new Worker(workerPath);

    mediaWorker.on('message', (msg) => {
        if (win && !win.isDestroyed()) {
            if (msg.type === 'music-changed') {
                console.log(`[后台捕获切歌] ${msg.data.title} - ${msg.data.artist}`);
            }
            win.webContents.send(msg.type, msg.data);
        }
    });

    mediaWorker.on('error', (err) => {
        console.error('媒体监听 Worker 报错:', err);
    });

    console.log("媒体控制线程已成功启动！");
} catch (e) {
    console.error("启动媒体监听线程失败:", e);
}
    tray = new Tray(path.join(__dirname, 'icon.ico')); 
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示 / 隐藏 右上角控制台',
            click: () => { if(win) win.webContents.send('tray-action', 'toggle-btn'); }
        },
        {
            label: '显示 / 隐藏 桌宠',
            click: () => { if(win) win.webContents.send('tray-action', 'toggle-char'); }
        },
        {
            label: '显示 / 隐藏 桌面挂件与手机',
            click: () => { if(win) win.webContents.send('tray-action', 'toggle-widgets'); }
        },
        { type: 'separator' }, 
        {
            label: '沉浸模式',
            type: 'checkbox',
            checked: false,
            click: (menuItem) => {
                const isImmersive = menuItem.checked;
                if (win && !win.isDestroyed()) {
                    win.webContents.send('toggle-immersive', isImmersive);
                }
                if (typeof physicalItems !== 'undefined') {
                    physicalItems.forEach(item => {
                        if (item.window && !item.window.isDestroyed()) {
                            if (isImmersive) {
                                item.window.hide(); 
                            } else {
                                item.window.show();
                            }
                        }
                    });
                }
            }
        }, 
        { type: 'separator' },
        {
            label: '退出 Bandori 桌宠',
            click: () => { app.quit(); }
        }
    ]);
    tray.setToolTip('Bandori 桌宠');
    tray.setContextMenu(contextMenu);

    ipcMain.on('window-min', () => win.minimize());
    ipcMain.on('window-max', () => {
        if (win.isMaximized()) win.unmaximize(); 
        else win.maximize();   
    });
    ipcMain.on('window-close', () => win.close());
    ipcMain.on('set-always-on-top', (event, isTop) => {
        if (isTop) {
            win.setAlwaysOnTop(true, 'screen-saver'); 
        } else {
            win.setAlwaysOnTop(false);
        }
    });
    ipcMain.on('set-ignore-mouse', (event, ignore) => {
        if (ignore) {
            win.setIgnoreMouseEvents(true, { forward: true });
        } else {
            win.setIgnoreMouseEvents(false);
        }
    });

let audioProcess = null;

ipcMain.on('toggle-cpp-audio', (event, enable) => {
    if (enable && !audioProcess) {
        let exePath = path.join(__dirname, 'sys_audio.exe');
        if (exePath.includes('app.asar')) {
            exePath = exePath.replace('app.asar', 'app.asar.unpacked');
        }
        
        if (!fs.existsSync(exePath)) {
            console.error("错误：找不到sys_audio.exe");
            return;
        }

        audioProcess = spawn(exePath);
        
        audioProcess.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            const lastLine = lines[lines.length - 1]; 
            
            if (lastLine.includes(',')) {
                const fftData = lastLine.split(',').map(Number);
                if (fftData.length === 64 && win && !win.isDestroyed()) {
                    win.webContents.send('audio-fft', fftData);
                }
            }
        });

        audioProcess.on('error', (err) => console.error("启动失败:", err));
        
    } else if (!enable && audioProcess) {
        audioProcess.kill();
        audioProcess = null;
    }
});
ipcMain.on('media-control', (event, action) => {
    let vk = 0;
    if (action === 'play-pause') vk = 179; 
    if (action === 'next') vk = 176;      
    if (action === 'prev') vk = 177;      
    
    if (vk) {
        const cmd = `powershell -NoProfile -Command "$c='[DllImport(\\"user32.dll\\")] public static extern void keybd_event(byte v,byte s,uint f,int i);'; $k=Add-Type -MemberDefinition $c -Name 'K' -PassThru; $k::keybd_event(${vk},0,0,0); $k::keybd_event(${vk},0,2,0);"`;
        exec(cmd);
    }
});
app.on('will-quit', () => {
    if (audioProcess) {
        audioProcess.kill();
        audioProcess = null;
    }
    if (sovitsProcess) {
        sovitsProcess.kill();
        sovitsProcess = null;
    }
    if (radarProcess) {
        radarProcess.kill();
        radarProcess = null;
    }
});

const { Engine, World, Bodies, Runner } = require('matter-js');
const physicsItemsDir = path.join(__dirname, 'physics_items');
if (!fs.existsSync(physicsItemsDir)) {
    fs.mkdirSync(physicsItemsDir, { recursive: true });
}

const engine = Engine.create();
const world = engine.world;
engine.gravity.y = 1.5;

let physicalItems = [];
let physicsTimer = null;
let currentBounciness = 0.6; 
let throwPowerMultiplier = 1.2;
let globalFrictionAir = 0.01;  

let draggingItemId = null;
let dragOffset = { x: 0, y: 0 };
let dragVelocity = { x: 0, y: 0 };

function startPhysicsLoop(fps) {
    if (physicsTimer) clearInterval(physicsTimer);
    const intervalMs = 1000 / fps;
    
    physicsTimer = setInterval(() => {
        Engine.update(engine, intervalMs);
        
        if (draggingItemId) {
            const item = physicalItems.find(i => i.id === draggingItemId);
            if (item) {
                const { screen } = require('electron');
                const cursor = screen.getCursorScreenPoint();
                const targetX = cursor.x + dragOffset.x;
                const targetY = cursor.y + dragOffset.y;
                
                dragVelocity = {
                    x: (targetX - item.body.position.x) * 0.4,
                    y: (targetY - item.body.position.y) * 0.4
                };
                
                Matter.Body.setPosition(item.body, { x: targetX, y: targetY });
                Matter.Body.setVelocity(item.body, { x: 0, y: 0 }); 
            }
        }

        physicalItems.forEach(item => {
            if (!item.window || item.window.isDestroyed()) return;
            const { x, y } = item.body.position;

            if (Number.isNaN(x) || Number.isNaN(y) || y > 5000 || y < -5000 || x > 10000 || x < -5000) {
                item.window.close(); 
                return;
            }
            const speed = Matter.Vector.magnitude(item.body.velocity);
            const angularSpeed = Math.abs(item.body.angularVelocity);
            if (!item.isDragging && speed < 0.1 && angularSpeed < 0.01) {
                return; 
            }
            try {
                item.window.setBounds({
                    x: Math.round(x - item.width / 2),
                    y: Math.round(y - item.height / 2),
                    width: Math.round(item.width),   
                    height: Math.round(item.height)  
                });
                if (item.window.webContents) {
                    item.window.webContents.send('sync-angle', item.body.angle);
                }
            } catch (err) {
            }
        });
    }, intervalMs);
}
startPhysicsLoop(60);

const { screen } = require('electron');
app.whenReady().then(() => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
    const wallOptions = { 
        isStatic: true, 
        friction: 0,       
        restitution: 0.9  
    };
    const ground = Bodies.rectangle(screenW / 2, screenH + 500, screenW + 2000, 1000, wallOptions);
    const leftWall = Bodies.rectangle(-500, screenH / 2, 1000, screenH + 2000, wallOptions);
    const rightWall = Bodies.rectangle(screenW + 500, screenH / 2, 1000, screenH + 2000, wallOptions);
    const ceiling = Bodies.rectangle(screenW / 2, -500, screenW + 2000, 1000, wallOptions);
    World.add(world, [ground, leftWall, rightWall, ceiling]);
});


ipcMain.handle('get-physics-images', () => {
    const files = fs.readdirSync(physicsItemsDir);
    return files.filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f)).map(f => {
        return { name: f, path: path.join(physicsItemsDir, f) };
    });
});

ipcMain.handle('save-physics-image', (event, sourcePath, fileName) => {
    const destPath = path.join(physicsItemsDir, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return { name: fileName, path: destPath };
});

ipcMain.handle('spawn-physics-item', (event, data) => {
    const { id, imgUrl, startX, startY, size, bounce } = data;
    
    let win = new BrowserWindow({
        width: size, height: size,
        transparent: true, frame: false, alwaysOnTop: true, resizable: false, skipTaskbar: true,
        type: 'toolbar', 
        webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
    });

    win.setAlwaysOnTop(true, 'screen-saver'); 

    const htmlContent = `
    <html>
    <head>
    <style>
        body { margin: 0; overflow: hidden; background: transparent; user-select: none; -webkit-user-select: none; }
        #drag-area { width: 100vw; height: 100vh; cursor: grab; display: flex; justify-content: center; align-items: center; }
        img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; -webkit-user-drag: none; transform-origin: center center; }
        #drag-area:active { cursor: grabbing; }
    </style>
    </head>
    <body>
        <div id="drag-area"><img id="item-img" src="${imgUrl}"></div>
        <script>
            const { ipcRenderer } = require('electron');
            const area = document.getElementById('drag-area');
            const img = document.getElementById('item-img');
            ipcRenderer.on('sync-angle', (e, angle) => {
                img.style.transform = 'rotate(' + angle + 'rad)';
            });
            area.addEventListener('mousedown', (e) => {
                if(e.button === 0) ipcRenderer.send('physics-drag-start', '${id}');
            });
            window.addEventListener('mouseup', (e) => {
                if(e.button === 0) ipcRenderer.send('physics-drag-end', '${id}');
            });
            window.addEventListener('mouseleave', () => {
                ipcRenderer.send('physics-drag-end', '${id}');
            });
            ipcRenderer.on('flash-effect', () => {
                img.style.filter = 'brightness(2) drop-shadow(0 0 10px white)';
                setTimeout(() => { img.style.filter = ''; }, 200);
            });
            window.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                ipcRenderer.send('physics-change-shape', '${id}'); 
            });
        </script>
    </body>
    </html>
    `;
    
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    const body = Bodies.polygon(startX, startY, 8, size / 2, {
        restitution: bounce, 
        friction: 0.1,
        frictionAir: globalFrictionAir, 
        render: { visible: false }
    });

    World.add(world, body);
    physicalItems.push({ id, window: win, body: body, width: size, height: size, shapeType: 'octagon' });
    win.on('closed', () => {
        World.remove(world, body);
        physicalItems = physicalItems.filter(i => i.id !== id);
    });
    return true;
});

ipcMain.on('physics-drag-start', (event, id) => {
    const item = physicalItems.find(i => i.id === id);
    if (item) {
        item.isDragging = true;
        draggingItemId = id;
        const cursor = screen.getCursorScreenPoint();
        dragOffset = {
            x: item.body.position.x - cursor.x,
            y: item.body.position.y - cursor.y
        };
        Matter.Body.setStatic(item.body, true); 
    }
});

ipcMain.on('physics-drag-end', (event, id) => {
    if (draggingItemId === id) {
        const item = physicalItems.find(i => i.id === id);
        if (item) {
            item.isDragging = false;
            Matter.Body.setStatic(item.body, false); 
            const finalVelocity = {
                x: dragVelocity.x * throwPowerMultiplier,
                y: dragVelocity.y * throwPowerMultiplier
            };
            Matter.Body.setVelocity(item.body, finalVelocity); 
        }
        draggingItemId = null;
    }
});

ipcMain.on('update-physics-params', (event, params) => {
    if (params.gravity !== undefined) engine.gravity.y = params.gravity;
    if (params.fps !== undefined) startPhysicsLoop(params.fps);
    if (params.throwPower !== undefined) throwPowerMultiplier = params.throwPower;
    if (params.frictionAir !== undefined) {
        globalFrictionAir = params.frictionAir;
        physicalItems.forEach(item => {
            item.body.frictionAir = globalFrictionAir;
        });
    }
});

ipcMain.on('resize-physics-item', (event, id, newSize) => {
    const item = physicalItems.find(i => i.id === id);
    if (item && !item.window.isDestroyed()) {
        const scaleFactor = newSize / item.width;
        item.width = newSize;
        item.height = newSize;
        Matter.Body.scale(item.body, scaleFactor, scaleFactor); 
    }
});

ipcMain.on('remove-physics-item', (event, id) => {
    const item = physicalItems.find(i => i.id === id);
    if (item && !item.window.isDestroyed()) item.window.close();
});

ipcMain.on('clear-all-physics', () => {
    physicalItems.forEach(item => {
        if (!item.window.isDestroyed()) item.window.close();
    });
    physicalItems = [];
});

let uiBodies = {};

ipcMain.on('update-ui-bodies', (event, boundsData) => {
    if (!win || win.isDestroyed()) return;
    const winBounds = win.getBounds(); 
    const currentIds = [];
    boundsData.forEach(data => {
        const { id, relX, relY, width, height } = data;
        if (width < 5 || height < 5 || isNaN(relX) || isNaN(relY)) return;
        currentIds.push(id);
        const absX = winBounds.x + relX;
        const absY = winBounds.y + relY;
        if (uiBodies[id]) {
            const body = uiBodies[id];
            if (Math.abs(body.customW - width) > 2 || Math.abs(body.customH - height) > 2) {
                World.remove(world, body);
                const newBody = Bodies.rectangle(absX, absY, width, height, {
                    isStatic: true,
                    friction: 0.1,
                    restitution: 0.5 
                });
                newBody.customW = width;
                newBody.customH = height;
                uiBodies[id] = newBody;
                World.add(world, newBody);
                console.log("碰撞箱已重建:", width, height);
            } else {
                Matter.Body.setPosition(body, { x: absX, y: absY });
            }
        } else {
            const newBody = Bodies.rectangle(absX, absY, width, height, {
                isStatic: true,
                friction: 0.1,
                restitution: 0.5 
            });
            newBody.customW = width;
            newBody.customH = height;
            uiBodies[id] = newBody;
            World.add(world, newBody);
        }
    });

    Object.keys(uiBodies).forEach(id => {
        if (!currentIds.includes(id)) {
            World.remove(world, uiBodies[id]);
            delete uiBodies[id];
        }
    });
});

const SHAPE_TYPES = ['circle', 'rectangle', 'octagon'];
ipcMain.on('physics-change-shape', (event, id) => {
    const item = physicalItems.find(i => i.id === id);
    if (!item || !item.body) return;
    let currentIndex = SHAPE_TYPES.indexOf(item.shapeType || 'circle');
    let nextIndex = (currentIndex + 1) % SHAPE_TYPES.length;
    let nextShape = SHAPE_TYPES[nextIndex];
    item.shapeType = nextShape;
    const oldPos = item.body.position;
    const oldVel = item.body.velocity;
    const oldAngle = item.body.angle;
    const oldAngVel = item.body.angularVelocity;

    Matter.World.remove(world, item.body);

    let newBody;
    const size = item.width; 
    const options = { 
        restitution: item.body.restitution || 0.5, 
        friction: item.body.friction || 0.1        
    };
    if (nextShape === 'circle') {
        newBody = Matter.Bodies.circle(oldPos.x, oldPos.y, size / 2, options);
    } else if (nextShape === 'rectangle') {
        newBody = Matter.Bodies.rectangle(oldPos.x, oldPos.y, size * 0.9, size * 0.9, options);
    } else if (nextShape === 'octagon') {
        newBody = Matter.Bodies.polygon(oldPos.x, oldPos.y, 8, size / 2, options);
    }

    Matter.Body.setVelocity(newBody, oldVel);
    Matter.Body.setAngle(newBody, oldAngle);
    Matter.Body.setAngularVelocity(newBody, oldAngVel);
    item.body = newBody;
    Matter.World.add(world, newBody);
    if (item.window && !item.window.isDestroyed()) {
        item.window.webContents.send('flash-effect');
    }
    if (win && !win.isDestroyed()) {
        win.webContents.send('physics-shape-updated', id, nextShape);
    }
});

let currentRadialKey = null;
    function registerGlobalKey() {
        globalShortcut.unregisterAll();
        if (!currentRadialKey) return;
        let shortcutKey = currentRadialKey;
        if (shortcutKey === ' ') shortcutKey = 'Space';
        if (shortcutKey.length === 1) shortcutKey = shortcutKey.toUpperCase();

        try {
            globalShortcut.register(shortcutKey, () => {
                if (win && !win.isDestroyed()) win.webContents.send('trigger-global-radial');
            });
        } catch (err) {}
    }

ipcMain.on('register-radial-shortcut', (event, key) => {
    currentRadialKey = key;
    if (win && !win.isFocused()) {
        registerGlobalKey();
    }
});

app.on('browser-window-focus', () => {
    globalShortcut.unregisterAll(); 
});

app.on('browser-window-blur', () => {
    registerGlobalKey(); 
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
});
