'use client';

import { Rect, Text, Group, Image as KonvaImage, Shape } from 'react-konva';
import type { UIWidget, StudioPage, DialogueTheme, DialogueLine } from '@/lib/store';
import { useStudioStore } from '@/lib/store';
import { evaluateCondition } from '@/lib/conditions';
import { parseRichText, layoutRichText } from '@/lib/richText';

function trimPartialTag(s: string): string {
  const lastOpen = s.lastIndexOf('[');
  if (lastOpen === -1) return s;
  if (s.lastIndexOf(']') > lastOpen) return s;
  return s.substring(0, lastOpen);
}

export interface WidgetContentProps {
  widget: UIWidget;
  wW: number;
  wH: number;
  isSelected: boolean;
  isHovered: boolean;
  isPlaytest: boolean;
  theme: DialogueTheme;
  currentPage: StudioPage;
  playtestState: {
    variableValues: Record<string, number | boolean | string>;
    widgetOverrides: Record<string, any>;
    dialogueLineIndex: number;
    dialogueStarted: boolean;
  };
  typewriterProgress: Record<string, number>;
  waveTime: number;
  animValues: Record<string, number>;
  portraitSwapAnim: Record<string, number>;
  widgetImages: Record<string, HTMLImageElement>;
  dlCurrentLine: DialogueLine | null;
  dlIsLastLine: boolean;
  pressedWidgetId: string | null;
  hoveredItemKey: string | null;
  setHoveredItemKey: (key: string | null) => void;
  width: number;
  height: number;
}

export default function WidgetContent({
  widget, wW, wH, isSelected, isHovered, isPlaytest, theme,
  currentPage, playtestState, typewriterProgress, waveTime, animValues, portraitSwapAnim,
  widgetImages, dlCurrentLine, dlIsLastLine, pressedWidgetId,
  hoveredItemKey, setHoveredItemKey, width, height,
}: WidgetContentProps) {
  const getSpeakerName = (id: string) => {
    const speakers = useStudioStore.getState().speakers || [];
    return speakers.find((s: any) => s.id === id)?.displayName.ru || id || '';
  };

  if (widget.type === 'dialogueBox') {
    const textSource = widget.data?.textSource || 'page';
    const overrideText = isPlaytest ? playtestState.widgetOverrides[widget.id]?.text : null;
    const effectiveText = overrideText || widget.text;
    const rawText = overrideText?.ru
      || dlCurrentLine?.text?.ru
      || (textSource === 'custom' && effectiveText?.ru ? effectiveText.ru : null)
      || currentPage?.text?.ru || '';

    const boxH = Math.max(48, wH);
    const innerPad = 14;
    const activeSpeakerId = dlCurrentLine?.speaker || currentPage?.speaker || '';
    const speakerName = widget.data?.speakerName
      || (activeSpeakerId ? getSpeakerName(activeSpeakerId) : '');
    const nameY = 4;
    const textStartY = speakerName ? 18 : 10;
    const boxStyle = widget.style || 'default';
    let boxFill = theme.boxFill;
    let boxStroke = isSelected ? theme.nameTagColor : theme.boxStroke;
    if (boxStyle === 'important') {
      boxStroke = isSelected ? theme.textColor : theme.nameTagColor;
    }

    const partialRaw = (isPlaytest && typewriterProgress[widget.id] !== undefined)
      ? trimPartialTag(rawText.substring(0, typewriterProgress[widget.id]))
      : rawText;

    const hasShakeTag = /\[shake\]/.test(partialRaw);

    let shakeX = 0;
    let shakeY = 0;
    if (isPlaytest) {
      const portraitW = (currentPage?.uiWidgets || []).find((ww: any) => ww.type === 'portrait');
      const pOverride = portraitW ? playtestState.widgetOverrides[portraitW.id] : null;
      const activeV = pOverride?.data?.variant || portraitW?.data?.variant || '';
      let intensity = 0;
      const intW = (currentPage?.uiWidgets || []).find((ww: any) => ww.type === 'intensityBar');
      if (intW?.data?.valueVar) {
        const v = useStudioStore.getState().variables.find((vv: any) => vv.id === intW.data!.valueVar);
        const live = playtestState.variableValues[intW.data!.valueVar];
        intensity = typeof live === 'number' ? live : (v?.defaultValue as number ?? 0);
      }
      if (activeV === 'angry' || intensity > 60) {
        const amp = activeV === 'angry' ? 1.5 : (intensity - 60) / 30;
        const t = Date.now() / 40;
        shakeX = Math.sin(t) * amp;
        shakeY = Math.cos(t * 1.3) * amp * 0.6;
      }
      if (hasShakeTag) {
        const t = Date.now() / 30;
        shakeX += Math.sin(t) * 2;
        shakeY += Math.cos(t * 0.8) * 1;
      }
    }

    const richFontSize = Math.max(11, Math.min(15, Math.round(height / 52)));
    const richSegments = parseRichText(partialRaw);
    const { words: richWords } = layoutRichText(richSegments, {
      maxWidth: wW - innerPad * 2,
      fontSize: richFontSize,
      lineHeightMultiplier: 1.32,
      defaultColor: theme.textColor,
    });

    return (
      <>
        <Rect
          x={shakeX}
          y={shakeY}
          width={wW}
          height={boxH}
          cornerRadius={theme.boxCornerRadius}
          fill={boxFill}
          stroke={boxStroke}
          strokeWidth={isSelected ? 2 : 1}
        />
        {speakerName && (
          <Text
            x={shakeX + innerPad}
            y={shakeY + nameY}
            text={speakerName}
            fontSize={Math.max(9, Math.min(12, Math.round(height / 60)))}
            fill={theme.nameTagColor}
            fontStyle="600"
            fontFamily={theme.fontFamily}
          />
        )}
        <Group x={shakeX + innerPad} y={shakeY + textStartY}>
          {richWords.map((word, idx) => {
            const waveY = word.wave ? Math.sin(waveTime / 300 + idx * 0.5) * 2.5 : 0;
            return (
              <Text
                key={idx}
                x={word.x} y={word.y + waveY}
                text={word.text}
                fontSize={word.size}
                fill={word.color}
                fontFamily={theme.fontFamily}
                fontStyle={word.bold && word.italic ? 'bold italic' : word.bold ? 'bold' : word.italic ? 'italic' : 'normal'}
              />
            );
          })}
        </Group>
        {isPlaytest && (() => {
          const prog = typewriterProgress[widget.id] ?? 0;
          const overrideT = playtestState.widgetOverrides[widget.id]?.text;
          const tSrc = widget.data?.textSource || 'page';
          const fullText = overrideT?.ru || dlCurrentLine?.text?.ru || (tSrc === 'custom' && widget.text?.ru ? widget.text.ru : null) || currentPage?.text?.ru || '';
          const isFinished = prog >= fullText.length;
          if (!isFinished) return null;
          const label = dlCurrentLine && !dlIsLastLine ? '▶ Далее' : (dlCurrentLine && dlIsLastLine ? '▶ Завершить' : '');
          if (!label) return null;
          return (
            <Text
              x={wW - innerPad - 28}
              y={wH - 14 + shakeY}
              text={label}
              fontSize={9}
              fill="#C5A46E"
              opacity={0.75}
              listening={false}
            />
          );
        })()}
      </>
    );
  }

  if (widget.type === 'textLabel' || widget.type === 'portrait') {
    const spId = widget.data?.speakerId || currentPage?.speaker || '';
    const defaultLabel = getSpeakerName(spId) || 'Speaker';
    const label = (widget.type === 'textLabel' && widget.text?.ru) ? widget.text.ru : defaultLabel;
    const portraitSpk = (widget.type === 'portrait' && !widget.assetId && widget.data?.speakerId)
      ? (useStudioStore.getState().speakers || []).find((s: any) => s.id === widget.data?.speakerId)
      : null;
    const resolvedAssetId = widget.assetId || portraitSpk?.portraitAssetId || null;
    const asset = resolvedAssetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === resolvedAssetId) : null;
    const variants = asset?.variants || {};
    const activeSpeakerForVariant = dlCurrentLine?.speaker || currentPage?.speaker || '';
    const lineVariant = (widget.type === 'portrait' && widget.data?.speakerId && widget.data.speakerId === activeSpeakerForVariant)
      ? (dlCurrentLine?.portraitVariant || null)
      : null;
    const activeVariant = lineVariant || widget.data?.variant || 'default';
    const variantUrl = variants[activeVariant] || asset?.url;
    let imgSrc = variantUrl ? variantUrl.trim().replace(/\\/g, '/') : null;
    if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('/')) imgSrc = '/' + imgSrc;
    const wImg = imgSrc ? widgetImages[imgSrc] : null;

    if (wImg && widget.type === 'portrait') {
      let pOpacity = 1;
      let pScale = 1;
      const swapTime = portraitSwapAnim[widget.id];
      if (swapTime && (Date.now() - swapTime < 350)) {
        const t = Math.min(1, (Date.now() - swapTime) / 350);
        pOpacity = 0.3 + 0.7 * t;
        pScale = 0.85 + 0.15 * t;
      }
      return (
        <KonvaImage
          image={wImg}
          width={wW}
          height={wH}
          opacity={pOpacity}
          scaleX={pScale}
          scaleY={pScale}
          x={(wW - wW * pScale) / 2}
          y={(wH - wH * pScale) / 2}
        />
      );
    }
    return (
      <>
        <Rect
          x={0}
          y={0}
          width={wW}
          height={wH}
          cornerRadius={4}
          fill="rgba(0,0,0,0.55)"
          stroke={isSelected ? theme.nameTagColor : theme.boxStroke}
          strokeWidth={isSelected ? 2 : 1}
        />
        <Text
          x={0}
          y={Math.max(2, (wH - 14) / 2)}
          width={wW}
          height={14}
          text={label}
          fontSize={Math.max(9, Math.min(12, Math.round(wH * 0.45)))}
          align="center"
          fill={theme.nameTagColor}
          fontStyle="500"
          fontFamily={theme.fontFamily}
        />
      </>
    );
  }

  if (widget.type === 'choiceButton') {
    const data = widget.data || {};

    if (data.items?.length) {
      const allItems: any[] = data.items;
      const getVarValue = (variableId: string) => {
        const live = playtestState.variableValues[variableId];
        if (live !== undefined) return live;
        const v = useStudioStore.getState().variables.find((vv: any) => vv.id === variableId);
        return v?.defaultValue;
      };

      const itemsWithVis = allItems.map((item: any, idx: number) => ({
        item,
        idx,
        visible: !item.visibleWhen || evaluateCondition(
          item.visibleWhen,
          useStudioStore.getState().variables,
          useStudioStore.getState().items,
          getVarValue
        ),
      }));

      const shownItems = isPlaytest
        ? itemsWithVis.filter((v: any) => v.visible)
        : itemsWithVis;

      if (shownItems.length === 0) return null;

      const gap = Math.max(2, Math.min(8, Math.round(wW * 0.015)));
      const btnW = (wW - gap * (shownItems.length - 1)) / shownItems.length;

      const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
      let cImgSrc = asset?.url ? asset.url.trim().replace(/\\/g, '/') : null;
      if (cImgSrc && !cImgSrc.startsWith('http') && !cImgSrc.startsWith('/')) cImgSrc = '/' + cImgSrc;
      const cImg = cImgSrc ? widgetImages[cImgSrc] : null;

      return (
        <Group>
          {shownItems.map(({ item, idx, visible }: any, i: number) => {
            const bx = i * (btnW + gap);
            const itemKey = `${widget.id}_${idx}`;
            const iHovered = hoveredItemKey === itemKey;
            const iPressed = pressedWidgetId === widget.id && iHovered;
            const itemOpacity = !isPlaytest && !visible ? 0.3 : 1;
            const fill = iPressed ? 'rgba(48,38,28,0.98)' : iHovered ? 'rgba(72,62,48,0.95)' : 'rgba(80,65,45,0.85)';

            return (
              <Group
                key={item.id || idx}
                x={bx}
                y={0}
                opacity={itemOpacity}
                onMouseEnter={() => { if (isPlaytest) setHoveredItemKey(itemKey); }}
                onMouseLeave={() => { if (isPlaytest) setHoveredItemKey(null); }}
                onClick={(e: any) => {
                  if (isPlaytest) {
                    e.cancelBubble = true;
                    if (item.actions?.length) {
                      for (const a of item.actions) useStudioStore.getState().executeAction(a);
                    }
                  }
                }}
                onTap={(e: any) => {
                  if (isPlaytest) {
                    e.cancelBubble = true;
                    if (item.actions?.length) {
                      for (const a of item.actions) useStudioStore.getState().executeAction(a);
                    }
                  }
                }}
              >
                {cImg ? (
                  <>
                    <KonvaImage image={cImg} width={btnW} height={wH} />
                    {!data.imageOnly && (
                      <Text x={2} y={wH / 2 - 6} width={btnW - 4} text={item.text?.ru || `Выбор ${idx + 1}`} fontSize={11} fill={theme.textColor} align="center" fontFamily={theme.fontFamily} />
                    )}
                  </>
                ) : (
                  <>
                    <Rect width={btnW} height={wH} cornerRadius={5} fill={fill} stroke={isSelected ? theme.textColor : theme.boxStroke} strokeWidth={isSelected ? 2.5 : 1} />
                    <Text x={2} y={wH / 2 - 6} width={btnW - 4} text={item.text?.ru || `Выбор ${idx + 1}`} fontSize={11} fill={theme.textColor} align="center" fontFamily={theme.fontFamily} />
                  </>
                )}
                {!isPlaytest && (
                  <Text x={3} y={2} text={`${idx + 1}`} fontSize={7} fill={theme.textColor} opacity={0.4} listening={false} />
                )}
              </Group>
            );
          })}
        </Group>
      );
    }

    // Legacy single-button
    const linkedBtn = data.linkedButtonId ? currentPage.buttons.find((b: any) => b.id === data.linkedButtonId) : null;
    const btnText = linkedBtn ? linkedBtn.text.ru : (widget.text?.ru || 'Choice');
    const isLinked = !!linkedBtn;
    const isPressed = pressedWidgetId === widget.id;
    const hoverFill = isPressed ? 'rgba(48,38,28,0.98)' : (isHovered ? 'rgba(72,62,48,0.95)' : (isLinked ? 'rgba(60,50,37,0.92)' : 'rgba(80,65,45,0.85)'));

    const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
    let cImgSrc = asset?.url ? asset.url.trim().replace(/\\/g, '/') : null;
    if (cImgSrc && !cImgSrc.startsWith('http') && !cImgSrc.startsWith('/')) cImgSrc = '/' + cImgSrc;
    const cImg = cImgSrc ? widgetImages[cImgSrc] : null;

    if (cImg) {
      if (data.imageOnly) return <KonvaImage image={cImg} width={wW} height={wH} />;
      return (
        <>
          <KonvaImage image={cImg} width={wW} height={wH} />
          <Text x={2} y={wH / 2 - 6} width={wW} text={btnText} fontSize={11} fill={theme.textColor} align="center" fontFamily={theme.fontFamily} />
        </>
      );
    }

    return (
      <>
        <Rect x={0} y={0} width={wW} height={wH} cornerRadius={5} fill={hoverFill} stroke={isSelected ? theme.textColor : (isLinked ? theme.nameTagColor : theme.boxStroke)} strokeWidth={isSelected ? 2.5 : (isLinked ? 1.8 : 1)} />
        <Text x={2} y={wH / 2 - 6} width={wW} text={btnText} fontSize={11} fill={theme.textColor} align="center" fontFamily={theme.fontFamily} />
      </>
    );
  }

  if (widget.type === 'intensityBar') {
    const data = widget.data || {};
    const varId = data.valueVar;
    let val = 50;
    if (varId) {
      const v = useStudioStore.getState().variables.find((vv: any) => vv.id === varId);
      const live = playtestState.variableValues[varId];
      val = typeof live === 'number' ? live : (v?.defaultValue as number ?? 50);
    }
    if (animValues[widget.id] !== undefined) {
      val = Number(animValues[widget.id]);
    }
    const parts = Math.max(1, Math.min(5, data.parts || 3));
    const clamped = Math.max(0, Math.min(100, val));
    const partWidth = wW / parts;
    const filledParts = Math.floor((clamped / 100) * parts);
    const isCritical = isPlaytest && clamped < 20;
    const pulseOpacity = isCritical ? 0.45 + 0.55 * Math.abs(Math.sin(Date.now() / 280)) : 1;

    return (
      <Group opacity={pulseOpacity}>
        {Array.from({ length: parts }).map((_, i) => {
          const isFilled = i < filledParts;
          const colors = data.colors || ['#4b2e1e', '#8a5a3a', '#c27a4a'];
          const fillColor = isFilled ? (colors[i % colors.length] || '#c27a4a') : '#2a221c';
          return (
            <Rect
              key={i}
              x={i * partWidth}
              y={0}
              width={partWidth - 1}
              height={wH}
              fill={fillColor}
              stroke="#534B40"
              strokeWidth={0.5}
            />
          );
        })}
        <Text
          x={0}
          y={wH / 2 - 5}
          width={wW}
          text={`${Math.round(clamped)}`}
          fontSize={9}
          fill="#EDE4D4"
          align="center"
        />
      </Group>
    );
  }

  if (widget.type === 'quickAction') {
    const data = widget.data || {};
    const actionType = data.actionType || 'custom';
    const label = actionType === 'inventory' ? 'И' :
                  actionType === 'map' ? 'К' :
                  actionType === 'skills' ? 'С' : '?';
    const isPressed = pressedWidgetId === widget.id;
    const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
    let qImgSrc = asset?.url ? asset.url.trim().replace(/\\/g, '/') : null;
    if (qImgSrc && !qImgSrc.startsWith('http') && !qImgSrc.startsWith('/')) qImgSrc = '/' + qImgSrc;
    const qImg = qImgSrc ? widgetImages[qImgSrc] : null;
    if (qImg) {
      return <KonvaImage image={qImg} width={wW} height={wH} opacity={isPressed ? 0.7 : 1} />;
    }
    return (
      <Group>
        <Rect
          x={0} y={0} width={wW} height={wH}
          cornerRadius={4}
          fill={isPressed ? 'rgba(40,35,25,0.98)' : (isHovered ? 'rgba(80,65,45,0.95)' : 'rgba(55,45,32,0.85)')}
          stroke="#534B40"
          strokeWidth={1}
        />
        <Text
          x={0} y={wH / 2 - 6}
          width={wW}
          text={label}
          fontSize={Math.min(14, wH * 0.7)}
          fill="#C5A46E"
          align="center"
          fontStyle="500"
        />
      </Group>
    );
  }

  if (widget.type === 'container') {
    const data = widget.data || {};
    return (
      <>
        <Rect
          x={0} y={0} width={wW} height={wH}
          fill="rgba(30,25,20,0.7)"
          stroke="#3a3020"
          strokeWidth={1.5}
          cornerRadius={4}
        />
        {data.title && (
          <Text
            x={2} y={2}
            width={wW - 4}
            text={data.title}
            fontSize={8}
            fill="#C5A46E"
            fontStyle="500"
          />
        )}
      </>
    );
  }

  if (widget.type === 'speechBubble') {
    const tailDir = widget.data?.tailDirection || 'bottom';
    const tailSize = Math.round(Math.min(wW * 0.14, wH * 0.28, 18));
    const r = Math.min(theme.boxCornerRadius, wW * 0.25, wH * 0.25);
    const cx = wW / 2;
    const my = wH / 2;
    const sbStroke = isSelected ? theme.nameTagColor : theme.boxStroke;

    let textOffsetX = 0, textOffsetY = 0, textMaxW = wW, textMaxH = wH;
    if (tailDir === 'bottom') { textMaxH = wH - tailSize; }
    else if (tailDir === 'left') { textOffsetX = tailSize; textMaxW = wW - tailSize; }
    else if (tailDir === 'right') { textMaxW = wW - tailSize; }

    const innerPad = 7;
    const sbFontSize = Math.max(9, Math.min(13, Math.round(height / 58)));
    const sbRawText = (widget.text?.ru) || dlCurrentLine?.text?.ru || currentPage?.text?.ru || '';
    const sbSegments = parseRichText(sbRawText);
    const { words: sbWords } = layoutRichText(sbSegments, {
      maxWidth: textMaxW - innerPad * 2,
      fontSize: sbFontSize,
      lineHeightMultiplier: 1.3,
      defaultColor: theme.textColor,
    });

    return (
      <>
        <Shape
          sceneFunc={(ctx: any) => {
            ctx.beginPath();
            if (tailDir === 'bottom') {
              const bH = wH - tailSize;
              ctx.moveTo(r, 0);
              ctx.lineTo(wW - r, 0); ctx.arcTo(wW, 0, wW, r, r);
              ctx.lineTo(wW, bH - r); ctx.arcTo(wW, bH, wW - r, bH, r);
              ctx.lineTo(cx + tailSize * 0.55, bH);
              ctx.lineTo(cx, wH);
              ctx.lineTo(cx - tailSize * 0.55, bH);
              ctx.lineTo(r, bH); ctx.arcTo(0, bH, 0, bH - r, r);
              ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r);
            } else if (tailDir === 'left') {
              const bX = tailSize;
              ctx.moveTo(bX + r, 0);
              ctx.lineTo(wW - r, 0); ctx.arcTo(wW, 0, wW, r, r);
              ctx.lineTo(wW, wH - r); ctx.arcTo(wW, wH, wW - r, wH, r);
              ctx.lineTo(bX + r, wH); ctx.arcTo(bX, wH, bX, wH - r, r);
              ctx.lineTo(bX, my + tailSize * 0.5);
              ctx.lineTo(0, my);
              ctx.lineTo(bX, my - tailSize * 0.5);
              ctx.lineTo(bX, r); ctx.arcTo(bX, 0, bX + r, 0, r);
            } else if (tailDir === 'right') {
              const bW = wW - tailSize;
              ctx.moveTo(r, 0);
              ctx.lineTo(bW - r, 0); ctx.arcTo(bW, 0, bW, r, r);
              ctx.lineTo(bW, my - tailSize * 0.5);
              ctx.lineTo(wW, my);
              ctx.lineTo(bW, my + tailSize * 0.5);
              ctx.lineTo(bW, wH - r); ctx.arcTo(bW, wH, bW - r, wH, r);
              ctx.lineTo(r, wH); ctx.arcTo(0, wH, 0, wH - r, r);
              ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r);
            } else {
              ctx.moveTo(r, 0);
              ctx.lineTo(wW - r, 0); ctx.arcTo(wW, 0, wW, r, r);
              ctx.lineTo(wW, wH - r); ctx.arcTo(wW, wH, wW - r, wH, r);
              ctx.lineTo(r, wH); ctx.arcTo(0, wH, 0, wH - r, r);
              ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r);
            }
            ctx.closePath();
            ctx.fillStyle = theme.boxFill;
            ctx.fill();
            ctx.strokeStyle = sbStroke;
            ctx.lineWidth = isSelected ? 2 : 1.5;
            ctx.stroke();
          }}
          width={wW}
          height={wH}
        />
        <Group x={textOffsetX + innerPad} y={textOffsetY + innerPad}>
          {sbWords.map((word, idx) => {
            const waveY = word.wave ? Math.sin(waveTime / 300 + idx * 0.5) * 2.5 : 0;
            return (
              <Text
                key={idx}
                x={word.x} y={word.y + waveY}
                text={word.text}
                fontSize={word.size}
                fill={word.color}
                fontFamily={theme.fontFamily}
                fontStyle={word.bold && word.italic ? 'bold italic' : word.bold ? 'bold' : word.italic ? 'italic' : 'normal'}
              />
            );
          })}
        </Group>
      </>
    );
  }

  if (widget.type === 'inventory') {
    const isPressed = pressedWidgetId === widget.id;
    const asset = widget.assetId ? (useStudioStore.getState().uiAssets || []).find((a: any) => a.id === widget.assetId) : null;
    let invImgSrc = asset?.url ? asset.url.trim().replace(/\\/g, '/') : null;
    if (invImgSrc && !invImgSrc.startsWith('http') && !invImgSrc.startsWith('/')) invImgSrc = '/' + invImgSrc;
    const invImg = invImgSrc ? widgetImages[invImgSrc] : null;
    if (invImg) {
      return <KonvaImage image={invImg} width={wW} height={wH} opacity={isPressed ? 0.7 : 1} />;
    }
    const invFontSize = Math.max(8, Math.min(14, wH * 0.28));
    return (
      <Group>
        <Rect
          x={0} y={0} width={wW} height={wH}
          cornerRadius={4}
          fill={isPressed ? 'rgba(40,35,25,0.98)' : (isHovered ? 'rgba(80,65,45,0.95)' : 'rgba(55,45,32,0.85)')}
          stroke={isSelected ? '#C5A46E' : '#534B40'}
          strokeWidth={isSelected ? 1.5 : 1}
        />
        <Text x={0} y={wH * 0.18} width={wW} text="🎒" fontSize={invFontSize * 1.4} align="center" />
        <Text x={0} y={wH * 0.62} width={wW} text="Инвентарь" fontSize={invFontSize} fill="#C5A46E" align="center" fontStyle="500" />
      </Group>
    );
  }

  return <Rect x={0} y={0} width={wW} height={wH} fill="#222" stroke="#555" />;
}
