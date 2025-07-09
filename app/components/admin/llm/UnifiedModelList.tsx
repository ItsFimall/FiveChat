'use client';

import React, { useEffect, useState, useRef } from "react";
import { fetchGroupedModels, updateModelFamilyOrder, saveModelsOrder } from "@/app/admin/llm/actions";
import { Skeleton, Typography, Collapse, List, Avatar, Empty } from "antd";
import { llmModelType } from "@/types/llm";
import { modelFamilies } from "@/app/db/schema";
import Sortable from 'sortablejs';

type ModelFamily = typeof modelFamilies.$inferSelect & { models: llmModelType[] };

const { Title, Text } = Typography;
const { Panel } = Collapse;

const UnifiedModelList = () => {
  const [groupedModels, setGroupedModels] = useState<ModelFamily[]>([]);
  const [uncategorizedModels, setUncategorizedModels] = useState<llmModelType[]>([]);
  const [loading, setLoading] = useState(true);

  const familiesContainerRef = useRef<HTMLDivElement>(null);
  const modelsContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchData = async () => {
    setLoading(true);
    const { groupedModels, uncategorizedModels } = await fetchGroupedModels();
    setGroupedModels(groupedModels);
    setUncategorizedModels(uncategorizedModels);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (loading || !familiesContainerRef.current) return;

    // Sort families
    const sortableFamilies = Sortable.create(familiesContainerRef.current, {
      animation: 150,
      handle: '.family-handle',
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        const newOrder = Array.from(familiesContainerRef.current!.children).map((child, index) => {
          return { id: Number(child.getAttribute('data-family-id')), order: index };
        });
        setGroupedModels(prev => {
          const reordered = [...prev];
          const [moved] = reordered.splice(evt.oldIndex!, 1);
          reordered.splice(evt.newIndex!, 0, moved);
          return reordered;
        });
        await updateModelFamilyOrder(newOrder);
      },
    });

    // Sort models within each family
    groupedModels.forEach(family => {
      const container = modelsContainerRefs.current[family.id];
      if (container) {
        Sortable.create(container, {
          group: 'models',
          animation: 150,
          onEnd: async (evt) => {
            if (evt.oldIndex === undefined || evt.newIndex === undefined || !evt.to.parentElement) return;
            const familyId = Number(evt.to.parentElement.getAttribute('data-family-id'));
            const providerId = evt.item.getAttribute('data-provider-id');
            const newOrder = Array.from(container.children).map((child, index) => {
              return { modelId: child.getAttribute('data-model-id')!, order: index };
            });
             // We need to update the state to reflect the new order visually
            setGroupedModels(prev => {
              const familyIndex = prev.findIndex(f => f.id === familyId);
              if (familyIndex === -1) return prev;
              const newFamilies = [...prev];
              const newModels = [...newFamilies[familyIndex].models];
              const [moved] = newModels.splice(evt.oldIndex!, 1);
              newModels.splice(evt.newIndex!, 0, moved);
              newFamilies[familyIndex] = { ...newFamilies[familyIndex], models: newModels };
              return newFamilies;
            });
            await saveModelsOrder(providerId!, newOrder);
          },
        });
      }
    });

    return () => {
      sortableFamilies.destroy();
    };
  }, [loading, groupedModels]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  return (
    <div>
      <Title level={4}>统一模型管理</Title>
      <Text type="secondary">按模型家族对所有模型进行分组。您可以拖动家族或家族内的模型进行排序。</Text>

      <div ref={familiesContainerRef} className="mt-4">
        {groupedModels.map((family, index) => (
          <div key={family.id} data-family-id={family.id} className="mb-2 family-handle">
            <Collapse defaultActiveKey={['1']}>
              <Panel header={<Title level={5}>{family.name}</Title>} key="1">
                <div ref={el => modelsContainerRefs.current[family.id] = el}>
                  {family.models.length > 0 ? (
                    family.models.map(item => (
                      <List.Item key={item.id} data-model-id={item.name} data-provider-id={item.providerId} style={{cursor: 'grab'}}>
                        <List.Item.Meta
                          avatar={<Avatar src={item.providerLogo} />}
                          title={item.displayName}
                          description={`Provider: ${item.providerName} | Model ID: ${item.name}`}
                        />
                      </List.Item>
                    ))
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该分组下暂无模型" />
                  )}
                </div>
              </Panel>
            </Collapse>
          </div>
        ))}
      </div>

      {uncategorizedModels.length > 0 && (
        <div className="mt-6">
          <Title level={5}>未分类模型</Title>
          <List
            itemLayout="horizontal"
            dataSource={uncategorizedModels}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <List.Item.Meta
                  avatar={<Avatar src={item.providerLogo} />}
                  title={item.displayName}
                  description={`Provider: ${item.providerName} | Model ID: ${item.name}`}
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default UnifiedModelList; 