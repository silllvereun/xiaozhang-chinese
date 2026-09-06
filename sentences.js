// First-release public reference sentences; independent of existing word IDs.
globalThis.ACADEMY_SENTENCES=[
  ['intro-1','HSK1','我是学生。','Wǒ shì xuésheng.','저는 학생입니다.'],
  ['intro-2','HSK1','我喜欢喝茶。','Wǒ xǐhuan hē chá.','저는 차 마시는 것을 좋아합니다.'],
  ['daily-1','HSK2','我每天早上七点起床。','Wǒ měitiān zǎoshang qī diǎn qǐchuáng.','저는 매일 아침 일곱 시에 일어납니다.'],
  ['oral-1','HSKK초급','请再说一遍。','Qǐng zài shuō yí biàn.','다시 한번 말씀해주세요.'],
  ['chat-1','회화','我们一起去吃饭吧。','Wǒmen yìqǐ qù chīfàn ba.','우리 같이 밥 먹으러 가요.'],
  ['work-1','업무','我今天到公司有点晚。','Wǒ jīntiān dào gōngsī yǒudiǎn wǎn.','저는 오늘 회사에 조금 늦게 도착했습니다.'],
  ['finance-1','금융','请确认银行账户。','Qǐng quèrèn yínháng zhànghù.','은행 계좌를 확인해주세요.'],
  ['exchange-1','거래소','今天的交易已经结束了。','Jīntiān de jiāoyì yǐjīng jiéshù le.','오늘 거래는 이미 끝났습니다.'],
  ['it-1','IT/개발','这个功能还需要测试。','Zhège gōngnéng hái xūyào cèshì.','이 기능은 아직 테스트가 필요합니다.'],
  ['crypto-1','암호화폐','请保管好你的私钥。','Qǐng bǎoguǎn hǎo nǐ de sīyào.','개인 키를 잘 보관해주세요.']
].map(([id,category,hanzi,pinyin,meaning])=>({id:'academy-'+id,categories:[category],hanzi,pinyin,meaning,content_type:'sentence',accepted:[],is_public:true}));
