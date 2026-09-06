-- Public first-release reference sentences. Existing sentences are never replaced.
begin;
insert into public.academy_sentences(id,chinese_text,pinyin,korean_text,categories) values
('academy-intro-1','我是学生。','Wǒ shì xuésheng.','저는 학생입니다.',ARRAY['HSK1']),
('academy-intro-2','我喜欢喝茶。','Wǒ xǐhuan hē chá.','저는 차 마시는 것을 좋아합니다.',ARRAY['HSK1']),
('academy-daily-1','我每天早上七点起床。','Wǒ měitiān zǎoshang qī diǎn qǐchuáng.','저는 매일 아침 일곱 시에 일어납니다.',ARRAY['HSK2']),
('academy-oral-1','请再说一遍。','Qǐng zài shuō yí biàn.','다시 한번 말씀해주세요.',ARRAY['HSKK초급']),
('academy-chat-1','我们一起去吃饭吧。','Wǒmen yìqǐ qù chīfàn ba.','우리 같이 밥 먹으러 가요.',ARRAY['회화']),
('academy-work-1','我今天到公司有点晚。','Wǒ jīntiān dào gōngsī yǒudiǎn wǎn.','저는 오늘 회사에 조금 늦게 도착했습니다.',ARRAY['업무']),
('academy-finance-1','请确认银行账户。','Qǐng quèrèn yínháng zhànghù.','은행 계좌를 확인해주세요.',ARRAY['금융']),
('academy-exchange-1','今天的交易已经结束了。','Jīntiān de jiāoyì yǐjīng jiéshù le.','오늘 거래는 이미 끝났습니다.',ARRAY['거래소']),
('academy-it-1','这个功能还需要测试。','Zhège gōngnéng hái xūyào cèshì.','이 기능은 아직 테스트가 필요합니다.',ARRAY['IT/개발']),
('academy-crypto-1','请保管好你的私钥。','Qǐng bǎoguǎn hǎo nǐ de sīyào.','개인 키를 잘 보관해주세요.',ARRAY['암호화폐'])
on conflict(id) do nothing;
commit;
