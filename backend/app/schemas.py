from pydantic import BaseModel, ConfigDict, Field

class Input(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Credentials(Input):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)


class FlagInput(Input):
    flag: str = Field(min_length=1, max_length=256)


