from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel


class GenerateDocRequest(BaseModel):
    logo: str
    include_title: bool
    title_img: str
    main_title: str
    author: str
    patient: str
    descr: str
    title_bg: str
    titles_li: List[str]
    img_li: List[List[str]]
    notes_li: List[str]
    metrics_li: List[Union[Dict[str, Any], List[Any]]]
    img_captions_li: Optional[list] = None
    image_layout: Optional[List[str]] = ["single", "single", "grid2"]
