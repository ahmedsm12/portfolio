const C3 = self.C3;
self.C3_GetObjectRefTable = function () {
	return [
		C3.Plugins.Sprite,
		C3.Plugins.Text,
		C3.Behaviors.DragnDrop,
		C3.Behaviors.Pin,
		C3.Plugins.Touch,
		C3.Behaviors.DragnDrop.Cnds.OnDragStart,
		C3.Plugins.Sprite.Cnds.PickChildren,
		C3.Plugins.Sprite.Acts.MoveToTop,
		C3.Plugins.Text.Acts.MoveToTop,
		C3.Plugins.Sprite.Cnds.IsOverlapping,
		C3.Plugins.Sprite.Cnds.CompareInstanceVar,
		C3.Plugins.Sprite.Cnds.CompareX,
		C3.Plugins.System.Cnds.PickAll,
		C3.Plugins.Sprite.Acts.SetVisible,
		C3.Plugins.Touch.Cnds.OnTouchStart,
		C3.Plugins.Sprite.Cnds.IsVisible,
		C3.Plugins.System.Acts.RestartLayout
	];
};
self.C3_JsPropNameTable = [
	{bg: 0},
	{Text: 0},
	{state: 0},
	{premiuim: 0},
	{DragDrop: 0},
	{عطارد: 0},
	{زهرة: 0},
	{الأرض: 0},
	{مريخ: 0},
	{مشتري: 0},
	{زحل: 0},
	{اورانوس: 0},
	{نيبتون: 0},
	{id: 0},
	{Pin: 0},
	{Text2: 0},
	{Touch: 0},
	{rock: 0},
	{gas: 0},
	{exel: 0}
];

self.InstanceType = {
	bg: class extends self.ISpriteInstance {},
	Text: class extends self.ITextInstance {},
	premiuim: class extends self.ISpriteInstance {},
	عطارد: class extends self.ISpriteInstance {},
	زهرة: class extends self.ISpriteInstance {},
	الأرض: class extends self.ISpriteInstance {},
	مريخ: class extends self.ISpriteInstance {},
	مشتري: class extends self.ISpriteInstance {},
	زحل: class extends self.ISpriteInstance {},
	اورانوس: class extends self.ISpriteInstance {},
	نيبتون: class extends self.ISpriteInstance {},
	Text2: class extends self.ITextInstance {},
	Touch: class extends self.IInstance {},
	exel: class extends self.ISpriteInstance {}
}