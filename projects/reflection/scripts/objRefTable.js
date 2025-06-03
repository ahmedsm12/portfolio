const C3 = self.C3;
self.C3_GetObjectRefTable = function () {
	return [
		C3.Plugins.Sprite,
		C3.Behaviors.CV_BoundedDragnDrop,
		C3.Behaviors.Tween,
		C3.Plugins.Text,
		C3.Plugins.Browser,
		C3.Plugins.System.Cnds.OnLayoutStart,
		C3.Plugins.Sprite.Acts.SetInstanceVar,
		C3.Plugins.Sprite.Exps.X,
		C3.Plugins.Sprite.Exps.Y,
		C3.Plugins.Browser.Acts.RequestFullScreen,
		C3.Behaviors.CV_BoundedDragnDrop.Cnds.OnDrop,
		C3.Plugins.Sprite.Cnds.IsOverlapping,
		C3.Plugins.Sprite.Acts.SetPos,
		C3.Plugins.Sprite.Cnds.CompareInstanceVar,
		C3.Plugins.Sprite.Acts.SetAngle,
		C3.Plugins.Text.Acts.SetText,
		C3.Plugins.System.Acts.WaitForPreviousActions,
		C3.Plugins.System.Cnds.ForEachOrdered,
		C3.Plugins.Sprite.Exps.IID,
		C3.Plugins.Sprite.Acts.SetAnimFrame,
		C3.Plugins.Sprite.Acts.SetOpacity,
		C3.Plugins.System.Exps.roundtodp
	];
};
self.C3_JsPropNameTable = [
	{bg: 0},
	{pos_x: 0},
	{pos_y: 0},
	{BoundedDragDrop: 0},
	{disk1: 0},
	{location: 0},
	{occ: 0},
	{light_opacity: 0},
	{frame: 0},
	{target: 0},
	{id: 0},
	{Tween: 0},
	{light_ray: 0},
	{disk2: 0},
	{disk3: 0},
	{disk4: 0},
	{disk5: 0},
	{percent_text: 0},
	{label1: 0},
	{label2: 0},
	{Browser: 0}
];

self.InstanceType = {
	bg: class extends self.ISpriteInstance {},
	disk1: class extends self.ISpriteInstance {},
	target: class extends self.ISpriteInstance {},
	light_ray: class extends self.ISpriteInstance {},
	disk2: class extends self.ISpriteInstance {},
	disk3: class extends self.ISpriteInstance {},
	disk4: class extends self.ISpriteInstance {},
	disk5: class extends self.ISpriteInstance {},
	percent_text: class extends self.ITextInstance {},
	label1: class extends self.ITextInstance {},
	label2: class extends self.ITextInstance {},
	Browser: class extends self.IInstance {}
}