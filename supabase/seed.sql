with demo_room as (
  insert into public.rooms (slug, name, visibility)
  values ('ember-demo', '余烬档案测试避难所', 'invite_only')
  on conflict (slug) do update set name = excluded.name
  returning id
),
demo_base as (
  insert into public.bases (room_id, name, day, resources)
  select
    id,
    '第十二号避难所',
    12,
    '{"food":18,"water":13,"materials":24,"medicine":8,"fuel":9,"ammo":7,"morale":61,"danger":17}'::jsonb
  from demo_room
  on conflict (room_id) do update set resources = excluded.resources
  returning id
)
insert into public.members (room_id, display_name, email, role, duty)
select id, '你', null, 'owner', '工程员' from demo_room
on conflict (room_id, display_name) do update set role = excluded.role, duty = excluded.duty;

with demo_room as (
  select id from public.rooms where slug = 'ember-demo'
)
insert into public.survivors
  (room_id, content_id, name, codename, profession, duty, attributes, traits, flaw, fatigue, injuries, note)
select
  demo_room.id,
  content_id,
  name,
  codename,
  profession,
  duty,
  attributes::jsonb,
  traits::jsonb,
  flaw,
  fatigue,
  injuries::jsonb,
  note
from demo_room,
(values
  ('lin','林岚','管线耳','斥候','侦察员','{"stamina":62,"agility":76,"technical":58,"medical":42,"social":45,"willpower":68,"luck":73,"infectionResistance":61}','["听管道像听天气预报","脚步轻"]','见到封条就想撕',12,'[]','能把危险说得像午餐菜单。'),
  ('mara','玛拉','绷带账房','医生','医疗员','{"stamina":48,"agility":44,"technical":51,"medical":82,"social":63,"willpower":78,"luck":49,"infectionResistance":74}','["药品精算","冷笑话止痛"]','会把所有人都按病人管理',7,'[]','她的急救箱比基地会议更有秩序。'),
  ('otto','奥托','三号扳手','工程师','工程员','{"stamina":59,"agility":37,"technical":86,"medical":35,"social":38,"willpower":64,"luck":41,"infectionResistance":57}','["废料再就业","发电机安抚师"]','相信每台机器都有脾气',15,'[]','如果世界坏了，他会先问有没有保修。'),
  ('pavel','帕维尔','铁门','守卫','守夜人','{"stamina":78,"agility":46,"technical":32,"medical":25,"social":35,"willpower":57,"luck":34,"infectionResistance":42}','["护送专家","不相信自动门"]','看到补给箱会过度自信',20,'[]','他能挡门，也常常忘了门往哪边开。')
) as data(content_id, name, codename, profession, duty, attributes, traits, flaw, fatigue, injuries, note)
on conflict (room_id, content_id) do update set
  fatigue = excluded.fatigue,
  injuries = excluded.injuries,
  attributes = excluded.attributes;

insert into public.locations
  (content_id, name, family, risk, recommended_stats, reward, tags, dossier, is_open)
values
  ('water-plant','北区水处理厂','resources',39,'["technical","medical","willpower"]','{"food":0,"water":10,"materials":2,"medicine":1,"fuel":0,"ammo":0}','["水源","潮湿","感染风险"]','旧阀门还在咳嗽，像有人在地下练习求救。', true),
  ('hospital','第七人民医院','urban',67,'["medical","willpower","infectionResistance"]','{"food":0,"water":0,"materials":2,"medicine":9,"fuel":0,"ammo":1}','["药品","感染","走廊回声"]','药柜很可能还满着，前提是你不介意它们被什么东西守着。', true),
  ('greenhouse','异常温室','weird',74,'["willpower","luck","infectionResistance"]','{"food":8,"water":2,"materials":1,"medicine":3,"fuel":0,"ammo":0}','["怪异","食物","精神压力"]','里面的植物会朝你转头。至少目前只有植物。', true)
on conflict (content_id) do update set
  risk = excluded.risk,
  reward = excluded.reward,
  is_open = excluded.is_open;

with demo_room as (
  select id from public.rooms where slug = 'ember-demo'
)
insert into public.facilities (room_id, content_id, name, level, status, effect)
select demo_room.id, content_id, name, level, status, effect
from demo_room,
(values
  ('dorm','宿舍',1,'stable','床位 12，疲劳恢复正常'),
  ('clinic','医疗站',1,'strained','可处理轻伤，重伤治疗缓慢'),
  ('generator','发电机',1,'strained','电力勉强覆盖夜间照明'),
  ('watchtower','哨塔',1,'stable','危险等级每日少量回落')
) as data(content_id, name, level, status, effect)
on conflict (room_id, content_id) do update set
  level = excluded.level,
  status = excluded.status,
  effect = excluded.effect;

with demo_room as (
  select id from public.rooms where slug = 'ember-demo'
)
insert into public.feed_items (room_id, kind, title, body)
select id, 'system', '避难所档案系统上线', '档案室表示：如果世界继续结束，请至少按格式提交战报。' from demo_room;
